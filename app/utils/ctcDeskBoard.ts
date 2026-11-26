// Desks on the CTC board (shared/utils/ctcDesks.ts gives the towns each covers): where each falls on the board, and
// the neighbors row, the trains in the desks next to yours that are heading your way, as board G shows it.

export interface BoardDesk {
  id: string
  name: string
  holder: string | null // the dispatcher's name; null when it's open
  mine: boolean
  from: string // its first town, or its first control point when it starts partway through a town
  stretch: string // "Whittier to Hemingway", or "Whittier East to Hemingway"
  x1: number // board pixels, boundary to boundary, for drawing
  x2: number
  starts: number // board pixels where it starts, for mileposts: its first town, or its first control point mid-town
  ends: number // where the next desk starts, or the line's end
  span: DeskSpan
}

export function boardDesks(line: CtcLineData, board: Board, spans: DeskSpan[], userId: string): BoardDesk[] {
  const pointX = new Map(board.points.map((p) => [p.id, p.x]))
  const pointName = new Map(board.points.map((p) => [p.id, p.name]))
  const townOf = new Map(line.towns.flatMap((t, k) => t.controlPoints.map((cp) => [cp, k] as const)))
  // A boundary falls halfway between the last control point of one desk and the first of the next.
  const edge = (k: number) => {
    const before = spans[k - 1]?.controlPoints.at(-1)
    const after = spans[k]?.controlPoints[0]
    return !before ? 0 : !after ? board.width : (pointX.get(before)! + pointX.get(after)!) / 2
  }
  // A desk's ends by town, or by control point where it shares the town with the next desk.
  const end = (cp: string, which: 'first' | 'last') => {
    const town = line.towns[townOf.get(cp)!]!
    const whole = which === 'first' ? town.controlPoints[0] === cp : town.controlPoints.at(-1) === cp
    return whole ? town.name : pointName.get(cp) ?? cp
  }
  // Where a desk starts, for its mileposts: at its first town as the board labels it, or at the control point it
  // starts at partway through a town.
  const startX = (k: number) => {
    const cp = spans[k]?.controlPoints[0]
    if (k === 0 || !cp) return k === 0 ? 0 : board.width
    const town = line.towns[townOf.get(cp)!]!
    return town.controlPoints[0] === cp ? board.towns[townOf.get(cp)!]!.x : pointX.get(cp)!
  }
  return spans.map((span, k) => {
    const from = end(span.controlPoints[0]!, 'first')
    const to = end(span.controlPoints.at(-1)!, 'last')
    return {
      id: span.desk.id,
      name: span.desk.name,
      holder: span.desk.holder?.name ?? null,
      mine: span.desk.holder?.userId === userId,
      from,
      stretch: from === to ? from : `${from} to ${to}`,
      x1: edge(k),
      x2: edge(k + 1),
      starts: startX(k),
      ends: startX(k + 1),
      span
    }
  })
}

// A desk's mileposts, from its first control point to where the next desk starts.
export function deskMileposts(board: Board, desk: BoardDesk) {
  const from = milepostAt(board, desk.starts)
  const to = milepostAt(board, desk.ends)
  return { from, to, miles: to - from }
}

// The milepost at board position x, between the towns either side of it.
export function milepostAt(board: Board, x: number) {
  const towns = board.towns
  const k = towns.findIndex((t) => t.x >= x)
  if (k < 0) return towns.at(-1)?.milepost ?? 0
  if (k === 0) return towns[0]!.milepost
  const a = towns[k - 1]!
  const b = towns[k]!
  return a.milepost + ((x - a.x) / (b.x - a.x)) * (b.milepost - a.milepost)
}

export interface Incoming {
  from: BoardDesk
  side: 'left' | 'right' // which side of your desks it's on
  town: string // your control point on that side, where they're handed over
  trains: { id: string; name: string; miles: number }[] // nearest first
}

// For each run of desks you hold, the desk on either side of it and its trains heading into yours.
export function incoming(board: Board, desks: BoardDesk[], trains: BoardTrain[]): Incoming[] {
  const found: Incoming[] = []
  desks.forEach((d, k) => {
    if (!d.mine) return
    const left = desks[k - 1]
    const right = desks[k + 1]
    const near = (from: BoardDesk, side: Incoming['side']) => {
      const edgeX = side === 'left' ? d.x1 : d.x2
      const list = trains
        .filter((t) => t.x >= from.x1 && t.x < from.x2 && t.right === (side === 'left'))
        .map((t) => ({ id: t.id, name: t.name, miles: Math.abs(milepostAt(board, t.x) - milepostAt(board, edgeX)) }))
        .sort((a, b) => a.miles - b.miles)
      const town = board.points.find((p) => p.id === (side === 'left' ? d.span.controlPoints[0] : d.span.controlPoints.at(-1)))?.name ?? ''
      found.push({ from, side, town, trains: list })
    }
    if (left && !left.mine) near(left, 'left')
    if (right && !right.mine) near(right, 'right')
  })
  return found
}

// What's still in effect on a desk, offered as the turnover note's list when leaving it (board I): routes cleared,
// switches lined reverse, and trains stopped in a siding.
export function turnoverItems(board: Board, desk: BoardDesk, aspects: Record<string, SignalAspect>, thrown: Record<string, boolean>, trains: BoardTrain[]): string[] {
  const end = board.towns.at(-1)?.name ?? ''
  const inDesk = (x: number) => x >= desk.x1 && x < desk.x2
  const points = board.points.filter((p) => inDesk(p.x))
  const cleared = points.flatMap((p) => {
    const ways = [...new Set(board.heads.filter((h) => h.cp === p.id && !h.intermediate && (aspects[h.signal] ?? 'stop') !== 'stop').map((h) => h.dir))]
    return ways.map((dir) => `${p.name} cleared ${dir > 0 ? 'toward' : 'away from'} ${end}`)
  })
  const reversed = points.filter((p) => p.switch && thrown[p.switch]).map((p) => `${p.name} switch lined reverse`)
  const waiting = trains.filter((t) => inDesk(t.x) && t.track === 'siding' && t.speedMph < 1).map((t) => `${t.name} waiting in the ${t.place} siding`)
  return [...cleared, ...reversed, ...waiting]
}
