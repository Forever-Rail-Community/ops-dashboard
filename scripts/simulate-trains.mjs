// Sends made-up Railroader trains to the dashboard, moving along the real track, so the live map can be
// tried before the game sends real positions. It posts exactly what the agent will: a "trains" report.
//
//   AGENT_KEY=fra_... node scripts/simulate-trains.mjs [dashboard address] [number of trains]
//   e.g. AGENT_KEY=fra_... node scripts/simulate-trains.mjs http://localhost:3000 6
//
// Use the key of a Railroader server from Admin > Servers. Needs Node.js 22.18 or newer (it loads the map's
// TypeScript curve code directly). Stop it with Ctrl+C; the map then shows the trains as last known positions.
import { readFileSync } from 'node:fs'
import { curveBetween, flatten } from '../app/utils/mapCurve.ts'

const [base = 'http://localhost:3000', count = '6'] = process.argv.slice(2)
const key = process.env.AGENT_KEY
if (!key) {
  console.error('Set AGENT_KEY to a Railroader server key from Admin > Servers.')
  process.exit(1)
}

const SEND_EVERY_SEC = 5
const MPH_TO_MPS = 0.44704
const map = JSON.parse(readFileSync(new URL('../server/assets/map.json', import.meta.url), 'utf8'))

// Which track pieces meet at each node, so a train can carry on past the end of a piece.
const piecesAt = new Map()
map.segments.forEach(([a, b], i) => {
  for (const node of [a, b]) piecesAt.set(node, [...(piecesAt.get(node) ?? []), i])
})

// Each piece as a polyline along its curve, with its length in meters.
const pieces = map.segments.map(([a, b]) => {
  const points = flatten(curveBetween(map, a, b), 12)
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
  return { a, b, points, length }
})

const pick = (list) => list[Math.floor(Math.random() * list.length)]

// Where a train is: on a piece, how far along it, and which way it runs (from end a to b, or back).
function pointOn(piece, distance, forward) {
  const along = forward ? distance : piece.length - distance
  let walked = 0
  for (let i = 1; i < piece.points.length; i++) {
    const [x1, z1] = piece.points[i - 1]
    const [x2, z2] = piece.points[i]
    const step = Math.hypot(x2 - x1, z2 - z1)
    if (walked + step >= along || i === piece.points.length - 1) {
      const t = step ? Math.min(1, (along - walked) / step) : 0
      const dx = (x2 - x1) * (forward ? 1 : -1)
      const dz = (z2 - z1) * (forward ? 1 : -1)
      return { x: x1 + (x2 - x1) * t, z: z1 + (z2 - z1) * t, heading: ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360 }
    }
    walked += step
  }
}

// At the end of a piece, carry on along another piece at that node (a switch picks one at random);
// at the end of the line, turn around.
function nextPiece(train) {
  const piece = pieces[train.piece]
  const node = train.forward ? piece.b : piece.a
  const options = (piecesAt.get(node) ?? []).filter((i) => i !== train.piece)
  if (!options.length) {
    train.forward = !train.forward
    return
  }
  train.piece = pick(options)
  train.forward = pieces[train.piece].a === node
}

const longPieces = pieces.map((p, i) => [p, i]).filter(([p]) => p.length > 150).map(([, i]) => i)
const trains = Array.from({ length: Number(count) }, (_, n) => ({
  id: `sim-${n + 1}`,
  name: `FR ${101 + n * 7}`,
  cars: 3 + Math.floor(Math.random() * 30),
  piece: pick(longPieces),
  distance: 0,
  forward: Math.random() < 0.5,
  cruise: 15 + Math.random() * 30, // mph
  stoppedFor: n % 3 === 0 ? 30 : 0 // some start out standing
}))

function advance(train, seconds) {
  if (train.stoppedFor > 0) {
    train.stoppedFor -= seconds
    train.speed = 0
    return
  }
  if (Math.random() < 0.02) train.stoppedFor = 20 + Math.random() * 40 // occasionally stop for a while
  train.speed = train.cruise
  let left = train.speed * MPH_TO_MPS * seconds
  while (left > 0) {
    const piece = pieces[train.piece]
    const room = piece.length - train.distance
    if (left < room) {
      train.distance += left
      left = 0
    } else {
      left -= room
      train.distance = 0
      nextPiece(train)
    }
  }
}

async function send() {
  for (const t of trains) advance(t, SEND_EVERY_SEC)
  const report = {
    game: 'railroader',
    sentAt: new Date().toISOString(),
    reports: {
      trains: {
        trains: trains.map((t) => {
          const { x, z, heading } = pointOn(pieces[t.piece], t.distance, t.forward)
          return { id: t.id, name: t.name, x, z, heading, speedMph: t.speed ?? 0, cars: t.cars }
        })
      }
    }
  }
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(report)
    })
    const reply = await res.json().catch(() => ({}))
    console.log(res.ok ? `Sent ${trains.length} trains. Accepted: ${reply.accepted?.join(', ')}` : `Refused (${res.status}): ${reply.statusMessage ?? res.statusText}`)
  } catch (err) {
    console.error(`Can't reach ${base}: ${err.message}`)
  }
}

console.log(`Simulating ${trains.length} trains, sending every ${SEND_EVERY_SEC}s to ${base}. Ctrl+C to stop.`)
send()
setInterval(send, SEND_EVERY_SEC * 1000)
