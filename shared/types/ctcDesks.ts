// Desks (FOR-15): a CTC line split into stretches of towns, each worked by one dispatcher at a time from the board.
// Staff set where each desk starts on the Edit desks page; the holder and the last turnover note change as
// dispatchers take and leave them.

export interface CtcDeskHolder {
  userId: string
  name: string
  since: string // ISO time they took it
}

// Written when leaving a desk, and read before taking it.
export interface CtcTurnoverNote {
  by: string
  at: string
  items: string[] // what's still in effect, picked from the board when leaving
  text: string
}

export interface CtcDesk {
  id: string
  lineId: string
  name: string
  // The first town's left control point. The line's first desk starts at its first town; each desk runs up to the
  // next one's start.
  start: string
  holder: CtcDeskHolder | null
  note: CtcTurnoverNote | null
}

// A line in the "Desk changes" list: who took or left a desk.
export interface CtcDeskChange {
  lineId: string
  at: string
  text: string
}

export interface CtcDesksData {
  desks: CtcDesk[]
  changes: CtcDeskChange[] // the last day's, newest first
}

