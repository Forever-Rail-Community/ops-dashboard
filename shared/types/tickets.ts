// Support tickets. A ticket is private to the person who opened it (the submitter) and staff ("tickets.manage").
// Everything that happens to a ticket is an event on its timeline: messages, internal notes (staff only), status
// changes and assignments. The same timeline will later back Discord threads and live chat.

export type TicketStatus = 'open' | 'progress' | 'waiting' | 'solved'
export type TicketKind = 'support' | 'member_report'
export type TicketGame = 'run8' | 'railroader' | 'none'

// One set of statuses for everyone. "waiting" is worded for whoever is reading: staff see who they're waiting on,
// the submitter sees that it's their turn.
export const TICKET_STATUSES: { value: TicketStatus; staffLabel: string; submitterLabel: string }[] = [
  { value: 'open', staffLabel: 'Open', submitterLabel: 'Open' },
  { value: 'progress', staffLabel: 'In progress', submitterLabel: 'In progress' },
  { value: 'waiting', staffLabel: 'Waiting on submitter', submitterLabel: 'Awaiting your reply' },
  { value: 'solved', staffLabel: 'Solved', submitterLabel: 'Solved' }
]

export const TICKET_KINDS: { value: TicketKind; label: string; description: string }[] = [
  { value: 'support', label: 'Get help', description: 'Connection, setup, or Operations Center questions' },
  { value: 'member_report', label: 'Report a member', description: 'Report a rule violation. Only staff can see these reports.' }
]

export const TICKET_GAMES: { value: TicketGame; label: string }[] = [
  { value: 'run8', label: 'Run8' },
  { value: 'railroader', label: 'Railroader' },
  { value: 'none', label: 'Not game-related' }
]

export const TICKET_LIMITS = { subject: 120, body: 4000, perDay: 5 }

// Tickets are shown as FR-<id>; ids start at 1001 so the first ones don't look like test data.
export const ticketRef = (id: number) => `FR-${id}`

// Where the ticket was opened, recorded automatically so staff don't have to ask (shown to staff only).
export interface TicketContext {
  page?: string // the Operations Center page the submitter came from
  browser?: string // e.g. "Chrome on Windows"
}

export interface TicketSummary {
  id: number
  kind: TicketKind
  game: TicketGame
  subject: string
  status: TicketStatus
  submitter: { id: string; name: string }
  assignee: { id: string; name: string } | null
  mine: boolean // opened by the viewer
  preview: string // the latest message, for lists
  createdAt: string
  updatedAt: string // last activity
}

export type TicketEventType = 'opened' | 'message' | 'note' | 'status' | 'assigned'

export interface TicketEvent {
  id: number
  type: TicketEventType
  author: { id: string; name: string; staff: boolean }
  body: string // the message or note; '' for other events
  status?: TicketStatus // for 'status' events
  assignee?: { id: string; name: string } | null // for 'assigned' events; null when unassigned
  via: string // where it was written: "Operations Center" (later also "Discord", "Help center")
  createdAt: string
}

export interface Ticket extends TicketSummary {
  context: TicketContext | null // staff only; null for the submitter
  events: TicketEvent[] // internal notes are left out for the submitter
}
