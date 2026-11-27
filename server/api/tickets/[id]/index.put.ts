// Staff set the status and assignee; the submitter can mark their own ticket solved.
export default defineEventHandler(async (event): Promise<Ticket> => {
  const { user } = await requireUserSession(event)
  const id = parseTicketId(getRouterParam(event, 'id'))
  const staff = await canManageTickets(user)
  const { before, ticket } = await updateTicket(id, parseTicketChanges(await readBody(event)), user, staff)
  if (before.status !== ticket.status) await logEvent(user, 'ticket.status', { id, subject: ticket.subject, status: ticket.status })
  if (before.assignee?.id !== ticket.assignee?.id) await logEvent(user, 'ticket.assign', { id, subject: ticket.subject, assignee: ticket.assignee?.name ?? null })
  return ticket
})
