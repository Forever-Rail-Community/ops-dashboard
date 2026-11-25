// Where everything goes on a CTC board: each piece of track, control point, signal head and town label, in board
// pixels. Drawn by CtcBoard.vue, which colours it by the live states. Left to right is the line's order. Track is
// schematic: every town is the same width, and each block between towns gets the same length.

type Point = [number, number]

export const BOARD = { left: 60, town: 230, link: 120, main: 196, siding: 146, leg: 26, stub: 34, height: 256, joint: 2 }

export interface BoardPiece {
  block: string
  x1: number
  y1: number
  x2: number
  y2: number
  // A leg or stub leaves the main at control point `cp`: drawn open when its switch isn't lined for it.
  cp?: string
  kind: 'main' | 'siding' | 'link' | 'leg' | 'stub'
}

export interface BoardPoint {
  id: string
  name: string
  x: number
  side: 'left' | 'right' | 'only'
  switch?: string
}

export interface BoardHead {
  signal: string
  x: number
  y: number
  dir: 1 | -1 // 1: points right
  intermediate: boolean
  // The track a cleared signal sends a train onto: a block, or (into a town) whichever track the switch lines.
  routeTo?: string | { switch: string; normal: string; reverse?: string }
}

export interface Board {
  width: number
  pieces: BoardPiece[]
  points: BoardPoint[]
  heads: BoardHead[]
  towns: { name: string; x: number; milepost: number; measured: boolean; mainCertain: boolean }[]
  miles: number
}

const METERS_PER_MILE = 1609.344
const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])

export function boardLayout(line: CtcLineData, layout: RailroaderSignalLayout): Board {
  const blocks = new Map(layout.blocks.map((b) => [b.id, b]))
  const signals = new Map(layout.signals.map((s) => [s.id, s]))
  const cps = new Map(layout.controlPoints.map((c) => [c.id, c]))
  const centre = (cpId: string): Point | null => {
    const pts = (cps.get(cpId)?.signals ?? []).map((id) => signals.get(id)).filter((s) => !!s)
    return pts.length ? [pts.reduce((a, p) => a + p.x, 0) / pts.length, pts.reduce((a, p) => a + p.z, 0) / pts.length] : null
  }
  const distTo = (id: string, p: Point) => Math.min(Infinity, ...(blocks.get(id)?.track.flat() ?? []).map((q) => dist(q, p)))
  const direction = (a: Point | null, b: Point | null): Point => {
    if (!a || !b) return [0, 0]
    const len = dist(a, b) || 1
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len]
  }
  // Track length along the line: each piece of the blocks it runs through, counted once (blocks share pieces where
  // they meet).
  const counted = new Set<string>()
  const lengthOf = (ids: string[]) =>
    ids.reduce((sum, id) => sum + (blocks.get(id)?.track ?? []).reduce((s, piece) => {
      const k = [piece[0]!, piece.at(-1)!].map((p) => p.map(Math.round).join(',')).sort().join('|')
      if (counted.has(k)) return s
      counted.add(k)
      return s + piece.slice(1).reduce((l, p, i) => l + dist(p, piece[i]!), 0)
    }, 0), 0)

  const M = BOARD.main
  const S = BOARD.siding
  const board: Board = { width: 0, pieces: [], points: [], heads: [], towns: [], miles: 0 }
  // Track as equal parts left to right, one per block, with a joint between blocks.
  const run = (via: string[], x1: number, x2: number, y: number, kind: BoardPiece['kind']) => {
    const step = (x2 - x1) / Math.max(1, via.length)
    via.forEach((block, k) => {
      const a = x1 + k * step
      board.pieces.push({ block, x1: a + (k ? BOARD.joint : 0), y1: y, x2: a + step - (k < via.length - 1 ? BOARD.joint : 0), y2: y, kind })
    })
  }
  let x = BOARD.left
  let meters = 0

  line.towns.forEach((town, i) => {
    const linkIn = line.links[i - 1]
    const linkOut = line.links[i]
    const [left, right = left] = town.controlPoints as [string, string?]
    const single = left === right
    const xL = x
    const xR = single ? x : x + BOARD.town
    // Left to right on the board, in the game's coordinates, here.
    const lineDir = single
      ? linkOut ? direction(centre(left), centre(linkOut.to)) : direction(centre(linkIn!.from), centre(left))
      : direction(centre(left), centre(right!))

    board.towns.push({ name: town.name, x: (xL + xR) / 2, milepost: town.milepost ?? meters / METERS_PER_MILE, measured: town.milepost === undefined, mainCertain: town.mainCertain })
    const points: [string, number, BoardPoint['side']][] = single ? [[left, xL, 'only']] : [[left, xL, 'left'], [right!, xR, 'right']]
    for (const [id, at, side] of points) board.points.push({ id, name: cps.get(id)?.name ?? id, x: at, side, switch: cps.get(id)?.switches[0] })

    if (!single) {
      run(town.main, xL, xR, M, 'main')
      const siding = town.sidings[0]
      if (siding?.length) {
        board.pieces.push({ block: siding[0]!, x1: xL, y1: M, x2: xL + BOARD.leg, y2: S, kind: 'leg', cp: left })
        run(siding, xL + BOARD.leg, xR - BOARD.leg, S, 'siding')
        board.pieces.push({ block: siding.at(-1)!, x1: xR - BOARD.leg, y1: S, x2: xR, y2: M, kind: 'leg', cp: right })
      }
      meters += lengthOf(town.main)
    }
    for (const end of town.deadEnds) {
      const at = end.from === left ? xL : xR
      const out = end.from === left ? -1 : 1
      board.pieces.push({ block: end.via[0]!, x1: at, y1: M, x2: at + out * BOARD.stub, y2: M - BOARD.stub, kind: 'stub', cp: end.from })
    }

    // The heads at this town's control points, on the track each stands on, pointing the way it faces.
    const ownTracks = [{ via: town.main, y: M }, ...town.sidings.slice(0, 1).map((via) => ({ via, y: S }))].filter((t) => t.via.length)
    for (const [cpId, at, side] of points) {
      const outward = side === 'left' ? -1 : side === 'right' ? 1 : 0
      const outBlock = (side !== 'right' && linkIn?.to === cpId ? linkIn.via.at(-1) : undefined) ?? (side !== 'left' && linkOut?.from === cpId ? linkOut.via[0] : undefined)
      for (const sigId of cps.get(cpId)?.signals ?? []) {
        const sig = signals.get(sigId)
        if (!sig) continue
        const p: Point = [sig.x, sig.z]
        const dir = sig.dx * lineDir[0] + sig.dz * lineDir[1] >= 0 ? 1 : -1
        const options = [
          ...ownTracks.map((t) => ({ y: t.y, inner: true, d: Math.min(...t.via.map((b) => distTo(b, p))) })),
          ...(outBlock ? [{ y: M, inner: false, d: distTo(outBlock, p) }] : [])
        ].sort((a, b) => a.d - b.d)
        const on = options[0] ?? { y: M, inner: false, d: 0 }
        const hx = outward === 0 ? at + dir * 14 : on.inner ? at - outward * (on.y === S ? BOARD.leg + 14 : 14) : at + outward * 14
        // Leaving the town, a cleared head sends a train onto the block beyond; entering it, onto whichever track
        // the switch lines.
        const toward = outward === 0 ? (linkOut ? 1 : -1) : outward
        let routeTo: BoardHead['routeTo']
        if (dir === toward) routeTo = outBlock
        else if (outward !== 0) {
          const sw = cps.get(cpId)?.switches[0]
          const end = (via: string[] | undefined) => (via?.length ? (side === 'left' ? via[0] : via.at(-1)) : undefined)
          if (sw) routeTo = { switch: sw, normal: end(town.main)!, reverse: end(town.sidings[0]) }
        }
        board.heads.push({ signal: sigId, x: hx, y: on.y, dir, intermediate: false, routeTo })
      }
    }

    x = xR
    if (!linkOut) return
    // Between towns: the blocks in order, and the intermediate signals at the joints between them.
    const xEnd = x + BOARD.link * linkOut.via.length
    run(linkOut.via, x, xEnd, M, 'link')
    const towardNext = direction(centre(linkOut.from), centre(linkOut.to))
    for (const sig of layout.signals) {
      if (!sig.intermediate) continue
      const p: Point = [sig.x, sig.z]
      let best: { k: number; d: number } | null = null
      for (let k = 1; k < linkOut.via.length; k++) {
        const d = distTo(linkOut.via[k - 1]!, p) + distTo(linkOut.via[k]!, p)
        if (!best || d < best.d) best = { k, d }
      }
      if (!best || best.d > 60) continue
      const dir = sig.dx * towardNext[0] + sig.dz * towardNext[1] >= 0 ? 1 : -1
      board.heads.push({ signal: sig.id, x: x + best.k * BOARD.link + dir * 10, y: M, dir, intermediate: true })
    }
    meters += lengthOf(linkOut.via)
    x = xEnd
  })

  board.width = x + BOARD.left
  board.miles = meters / METERS_PER_MILE
  return board
}

// Which blocks a dispatcher has routed: those a cleared control point signal sends a train onto. Automatic
// (intermediate) signals clear by themselves, so they don't count.
export function routedBlocks(board: Board, aspects: Record<string, SignalAspect>, thrown: Record<string, boolean>) {
  const routed = new Set<string>()
  for (const h of board.heads) {
    if (h.intermediate || !h.routeTo || (aspects[h.signal] ?? 'stop') === 'stop') continue
    if (typeof h.routeTo === 'string') routed.add(h.routeTo)
    else {
      const block = thrown[h.routeTo.switch] ? h.routeTo.reverse : h.routeTo.normal
      if (block) routed.add(block)
    }
  }
  return routed
}
