// One ticket and its timeline: your own, or any for staff (who also see internal notes and the context).
export default defineEventHandler(async (event): Promise<Ticket> => {
  const { user } = await requireUserSession(event)
  return getTicket(parseTicketId(getRouterParam(event, 'id')), user.id, await canManageTickets(user))
})
