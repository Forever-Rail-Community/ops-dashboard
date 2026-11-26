// Which control points and towns each desk covers on its line (shared/types/ctcDesks.ts), for the Desks page, the
// board, and the server's check that a command is for a desk the sender holds.
//
// A desk starts at a control point and runs up to the next desk's start. Starting at a town's first control point
// takes the whole town; starting at its second splits the town, so a train is handed over inside it.

export const DESK_NOTE_MAX = 1000
export const DESK_NOTE_ITEMS_MAX = 20
export const DESK_BEAT_SEC = 45 // how often an open board or Desks page says its dispatcher is still there
export const DESK_AWAY_SEC = 120 // without one for this long, they're taken off their desk

export interface DeskSpan {
  desk: CtcDesk
  controlPoints: string[] // in line order
  first: number // the line's towns, by index: the towns whose first control point is on this desk
  last: number
}

// The line's control points in order, each with its town.
const linePoints = (line: CtcLineData) => line.towns.flatMap((t, town) => t.controlPoints.map((id, k) => ({ id, town, firstOfTown: k === 0 })))

// Desks in line order. A desk whose start isn't on the line any more (the line was changed) is left out until staff
// set it again, and the first desk always starts at the line's start.
export function deskSpans(line: CtcLineData, desks: CtcDesk[]): DeskSpan[] {
  const points = linePoints(line)
  const placed = desks
    .map((desk) => ({ desk, at: points.findIndex((p) => p.id === desk.start) }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at)
  return placed.map((s, k) => {
    const own = points.slice(k ? s.at : 0, placed[k + 1]?.at ?? points.length)
    const towns = own.filter((p) => p.firstOfTown).map((p) => p.town)
    return { desk: s.desk, controlPoints: own.map((p) => p.id), first: towns[0] ?? own[0]!.town, last: towns.at(-1) ?? own[0]!.town }
  })
}

// Whether a desk starts partway through a town, at its second control point.
export const startsMidTown = (line: CtcLineData, start: string) => line.towns.some((t) => t.controlPoints.indexOf(start) > 0)

export const spanSidings = (line: CtcLineData, span: DeskSpan) =>
  line.towns.slice(span.first, span.last + 1).reduce((n, t) => n + t.sidings.filter((s) => s.length).length, 0)
