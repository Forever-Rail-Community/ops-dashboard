// Replies on a ticket: the submitter on their own, staff on any. Staff can add internal notes ({ note: true }).
export default defineEventHandler(async (event): Promise<Ticket> => {
  const { user } = await requireUserSession(event)
  const id = parseTicketId(getRouterParam(event, 'id'))
  return addTicketMessage(id, parseMessage(await readBody(event)), user, await canManageTickets(user))
})
