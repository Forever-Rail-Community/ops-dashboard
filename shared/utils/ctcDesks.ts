// Which control points and towns each desk covers on its line (shared/types/ctcDesks.ts), for the Desks page, the
// board, and the server's check that a command is for a desk the sender holds.
//
// A desk starts at a control point and runs up to the next desk's start. Starting at a town's first control point
// takes the whole town; starting at its second splits the town, so a train is handed over inside it.

// Comments go above these lines, not after them: the auto-import scanner reads a comma in a trailing comment as
// another export, and then misses the next line's.
export const DESK_NOTE_MAX = 1000
export const DESK_NOTE_ITEMS_MAX = 20
// How often an open board or Desks page says its dispatcher is still there.
export const DESK_BEAT_SEC = 45
// Without a check-in for this long, they're taken off their desk.
export const DESK_AWAY_SEC = 120
// Minutes with no activity before being taken off, 0 for never.
export const DESK_IDLE_CHOICES = [0, 10, 15, 30, 60]
// Desks on one line, and so the most one dispatcher can cover.
export const DESK_LINE_MAX = 12
// How long the holder has to answer a request, or before a takeover hands the desk over.
export const DESK_REQUEST_SEC = 60
// How often a page on a desk, or waiting on a request, checks for requests.
export const DESK_REQUEST_POLL_SEC = 5
export const DEFAULT_DESK_SETTINGS: CtcDeskSettings = { idleMinutes: 0, maxDesks: 1, sound: false }
// Saved settings from before a rule was added get its default.
export const deskSettings = (data: CtcDesksData | null | undefined, lineId: string): CtcDeskSettings => ({ ...DEFAULT_DESK_SETTINGS, ...data?.settings[lineId] })

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

// Why a dispatcher can't clock in to a desk on their line (or be given it), or null if they can: they can be on up to
// maxDesks, each next to another of theirs. The server checks the same.
export function deskCoverProblem(spans: DeskSpan[], deskId: string, userId: string, maxDesks: number): string | null {
  const at = spans.findIndex((s) => s.desk.id === deskId)
  const mine = spans.flatMap((s, k) => (s.desk.holder?.userId === userId ? [k] : []))
  if (!mine.length) return null
  const names = mine.map((k) => spans[k]!.desk.name).join(' and ')
  if (maxDesks <= 1) return `You are on duty on ${names}. Clock out before clocking in here.`
  if (mine.length >= maxDesks) return `You are on the maximum of ${maxDesks} desks for this line. Clock out of one first.`
  if (!mine.some((k) => Math.abs(k - at) === 1)) return `You may only cover desks adjacent to ${names}.`
  return null
}
