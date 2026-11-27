// Your tickets; with ?all=1, everyone's (staff only).
export default defineEventHandler(async (event): Promise<TicketSummary[]> => {
  const { user } = await requireUserSession(event)
  const all = getQuery(event).all === '1'
  if (all) await requirePermission(event, 'tickets.manage')
  return listTickets(user.id, all)
})
