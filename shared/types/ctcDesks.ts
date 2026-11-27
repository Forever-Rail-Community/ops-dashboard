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

// What kind of desk change a line in the timeline is, for its icon: clocked in, clocked out, clocked out
// automatically, a transfer approved, a staff takeover, a transfer requested or withdrawn, a request declined or
// expired, or the desks edited.
export type CtcDeskChangeKind = 'in' | 'out' | 'auto' | 'transfer' | 'takeover' | 'request' | 'declined' | 'edit'

// A line in the "Desk changes" timeline.
export interface CtcDeskChange {
  lineId: string
  at: string
  kind: CtcDeskChangeKind
  text: string
}

// A line's desk rules, set on Edit desks.
export interface CtcDeskSettings {
  idleMinutes: number // take a dispatcher off after this long with no activity on the site; 0 for never
  maxDesks: number // how many desks one dispatcher can be on at once, each next to another of theirs (covering)
  sound: boolean // play a sound for takeover requests and the board's alerts
}

// Someone asking the dispatcher on a desk for it (FOR-17). The holder gives it or keeps it, and no answer by `until`
// keeps it. Staff with "Take over a desk without asking" don't ask: the holder is shown that they're taking it over,
// and it's handed over at `until`, but only once the holder's page has shown them (`seen`).
export interface CtcDeskRequest {
  deskId: string
  deskName: string
  sound: boolean // the desk's line plays a sound for requests (Edit desks)
  from: { userId: string; name: string }
  to: { userId: string; name: string } // who was on the desk when they asked
  takeover: boolean
  at: string
  until: string
  seen: boolean
}

// A notification for one dispatcher about a request (approved, declined, expired, a takeover done), shown once as a
// toast on whatever page of the site they have open.
export interface CtcDeskNotice {
  id: string
  userId: string
  at: string
  success: boolean
  title: string
  description: string
}

// What a page on a desk, or waiting on a request, checks every DESK_REQUEST_POLL_SEC: every open request (the Desks
// page shows them on each desk), notices for this dispatcher, and whether they're on a desk.
export interface CtcDeskRequestsData {
  requests: CtcDeskRequest[]
  notices: CtcDeskNotice[]
  onDesk: boolean
}

export interface CtcDesksData {
  desks: CtcDesk[]
  changes: CtcDeskChange[] // the last day's, newest first
  settings: Record<string, CtcDeskSettings> // by line id; a line not listed uses DEFAULT_DESK_SETTINGS
}

