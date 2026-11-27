// Trains on the CTC board: which piece of track each one is on (the block it's in), which way it's going, where it is
// in words, and the next signal ahead of it. The board draws its tag off the track, as board E does (CtcBoard.vue).
// `x` is the middle of that block on the board; `at` is how far through the block it is, for the next signal.

const NEAR_BLOCK_M = 25 // a train no farther than this from a block's track can be in it
const TRAIN_PIECES: BoardPiece['kind'][] = ['main', 'siding', 'link']

export interface BoardTrain {
  id: string
  name: string
  x: number
  y: number // the track it's on
  right: boolean // heading left to right on the board
  speedMph: number
  cars: number
  place: string
  track: 'main' | 'siding' | 'line'
  next?: { signal: string; cp?: string; aspect: SignalAspect }
}

// The board block each train is in: the one drawn on the board whose track passes nearest it, within NEAR_BLOCK_M (a
// siding and its main can be only a few meters apart, so the nearest wins, not the first close enough). Blocks the
// board doesn't draw (a control point's switch block) are left out, so a train there shows on the track beside it.
export function trainBlocks(board: Board, layout: RailroaderSignalLayout, trains: LiveTrain[]): Map<string, string> {
  const drawn = new Set(board.pieces.filter((p) => TRAIN_PIECES.includes(p.kind)).map((p) => p.block))
  const blocks = layout.blocks.filter((b) => drawn.has(b.id))
  const found = new Map<string, string>()
  for (const t of trains) {
    let best = { id: '', d: NEAR_BLOCK_M }
    for (const b of blocks) {
      for (const piece of b.track) for (const [x, z] of piece) {
        const d = Math.hypot(x - t.x, z - t.z)
        if (d <= best.d) best = { id: b.id, d }
      }
    }
    if (best.id) found.set(t.id, best.id)
  }
  return found
}

// Which way each train is going along the board, kept between refreshes: from how it has moved along the board once it
// has moved MOVED_PX, otherwise as it was last time. The game's heading is used only for a train not seen moving yet:
// near a switch or on a curve, the heading measured against a block's overall direction can point the wrong way for a
// moment.
export type TrainDirections = Map<string, { at: number; right: boolean }>
const MOVED_PX = 3

export function boardTrains(board: Board, layout: RailroaderSignalLayout, aspects: Record<string, SignalAspect>, trains: LiveTrain[], directions?: TrainDirections): BoardTrain[] {
  const blocks = new Map(layout.blocks.map((b) => [b.id, b.track.flat()]))
  const inBlock = trainBlocks(board, layout, trains)
  for (const id of directions?.keys() ?? []) if (!trains.some((t) => t.id === id)) directions!.delete(id)
  return trains.flatMap((t): BoardTrain[] => {
    const piece = board.pieces.find((p) => TRAIN_PIECES.includes(p.kind) && p.block === inBlock.get(t.id))
    if (!piece) return []
    const [ax, az] = piece.along
    // How far through the block it is, left to right, measured along the board's direction here.
    const along = blocks.get(piece.block)!.map(([x, z]) => x * ax + z * az)
    const lo = Math.min(...along)
    const hi = Math.max(...along)
    const share = hi > lo ? Math.min(1, Math.max(0, (t.x * ax + t.z * az - lo) / (hi - lo))) : 0.5
    const at = piece.x1 + share * (piece.x2 - piece.x1)
    const x = (piece.x1 + piece.x2) / 2
    const last = directions?.get(t.id)
    let right = Math.sin((t.heading * Math.PI) / 180) * ax + Math.cos((t.heading * Math.PI) / 180) * az >= 0
    if (last && Math.abs(at - last.at) < MOVED_PX) right = last.right
    else if (last) right = at > last.at
    if (!last || Math.abs(at - last.at) >= MOVED_PX) directions?.set(t.id, { at, right })
    const ahead = board.heads
      .filter((h) => (h.dir === 1) === right && (right ? h.x > at : h.x < at) && (h.y === piece.y1 || h.track === 'out' || h.intermediate))
      .sort((a, b) => Math.abs(a.x - at) - Math.abs(b.x - at))[0]
    return [{
      id: t.id, name: t.name, x, y: piece.y1, right, speedMph: t.speedMph, cars: t.cars, place: piece.place,
      track: piece.kind === 'link' ? 'line' : piece.kind === 'siding' ? 'siding' : 'main',
      next: ahead ? { signal: ahead.signal, cp: ahead.cp, aspect: aspects[ahead.signal] ?? 'unknown' } : undefined
    }]
  })
}
