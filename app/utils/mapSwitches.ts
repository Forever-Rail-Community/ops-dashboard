// Which way each switch is lined, shown on the track itself the way CTC screens do: the leg a switch isn't lined
// for is drawn open, with a short gap, so the lined route is the one continuous line through it. The position
// comes from the tracker pack; which leg is normal and which reverse comes from the signals mod (0.2 or newer).
//
// The map is drawn to scale, so close to the points the two legs lie on top of each other; a gap there wouldn't
// show. It goes where the leg has pulled clear of the lined one instead (`openFrom`).

// A switch whose leg is open: the piece it isn't lined for, the piece it is, and the switch's node.
export interface OpenLeg {
  piece: number
  lined: number
  node: number
}

// The open leg of each switch, by the game's switch id. A switch whose position or legs aren't reported, or whose
// pieces aren't in the map data, is left out.
export function unlinedPieces(map: MapData, legs: Record<string, [string, string]>, thrown: Record<string, boolean>) {
  const open = new Map<string, OpenLeg>()
  map.switchIds.forEach((id, k) => {
    const state = thrown[id]
    const pair = legs[id]
    if (state === undefined || !pair) return
    const piece = pieceById(map, state ? pair[0] : pair[1])
    const lined = pieceById(map, state ? pair[1] : pair[0])
    if (piece !== undefined && lined !== undefined) open.set(id, { piece, lined, node: map.switches[k]! })
  })
  return open
}

const STEP = 0.5 // meters between the points where the two legs' separation is measured
const LOOK = 120 // meters along the leg to look; beyond that, a gap would be far from its switch

// How far apart the open leg is from the lined one, every STEP meters along the open leg from the switch.
const separations = new WeakMap<MapData, Map<string, number[]>>()
function separation(map: MapData, leg: OpenLeg) {
  let byLeg = separations.get(map)
  if (!byLeg) separations.set(map, (byLeg = new Map()))
  const key = `${leg.piece}:${leg.lined}:${leg.node}`
  let found = byLeg.get(key)
  if (!found) {
    const open = resample(fromNode(map, leg.piece, leg.node), STEP, LOOK)
    const lined = fromNode(map, leg.lined, leg.node)
    found = open.map((point) => distanceToLine(point, lined))
    byLeg.set(key, found)
  }
  return found
}

// How many meters along the open leg, from the switch, its gap starts: where the leg is `clear` meters from the
// lined one (the width the track is drawn at). If it never gets that far apart in sight, a third of the way along.
export function openFrom(map: MapData, leg: OpenLeg, clear: number, length: number) {
  const apart = separation(map, leg)
  const i = apart.findIndex((d) => d >= clear)
  return i >= 0 ? i * STEP : Math.min(length, LOOK) / 3
}

// The piece's curve as points in map meters, starting at `node` (reversed when the node is its far end).
function fromNode(map: MapData, piece: number, node: number): Point[] {
  const [a, b] = map.segments[piece]!
  const points = flatten(curveBetween(map, a, b), 24)
  return a === node ? points : [...points].reverse()
}

// Points every `step` meters along a line, up to `max` meters.
function resample(line: Point[], step: number, max: number): Point[] {
  const out: Point[] = [line[0]!]
  let carried = 0
  for (let i = 1; i < line.length && out.length * step <= max; i++) {
    const [ax, az] = line[i - 1]!
    const [bx, bz] = line[i]!
    const length = Math.hypot(bx - ax, bz - az)
    for (let d = step - carried; d <= length; d += step) out.push([ax + ((bx - ax) * d) / length, az + ((bz - az) * d) / length])
    carried = (carried + length) % step
  }
  return out
}

function distanceToLine([px, pz]: Point, line: Point[]) {
  let best = Infinity
  for (let i = 1; i < line.length; i++) best = Math.min(best, distToSegment(px, pz, ...line[i - 1]!, ...line[i]!))
  return best
}
