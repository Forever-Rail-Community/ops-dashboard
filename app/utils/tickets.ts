// How a ticket's status reads and looks. Staff see who a waiting ticket is waiting on; the submitter sees it's
// their turn. Colors follow the dashboard's pills (PagePill).

const TONES: Record<TicketStatus, PillTone> = { open: 'blue', progress: 'amber', waiting: 'violet', solved: 'green' }

export function ticketStatus(status: TicketStatus, asStaff: boolean): { label: string; tone: PillTone } {
  const s = TICKET_STATUSES.find((x) => x.value === status)!
  return { label: asStaff ? s.staffLabel : s.submitterLabel, tone: TONES[status] }
}

export const ticketKindLabel = (kind: TicketKind) => TICKET_KINDS.find((k) => k.value === kind)!.label
export const ticketGameLabel = (game: TicketGame) => TICKET_GAMES.find((g) => g.value === game)!.label

// "2:15 PM" today, "Nov 23, 2:15 PM" before that.
export function ticketTime(iso: string) {
  const d = new Date(iso)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toDateString() === new Date().toDateString() ? time : `${shortDate(iso)}, ${time}`
}
