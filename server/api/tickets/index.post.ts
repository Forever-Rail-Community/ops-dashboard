// Opens a ticket. Anyone signed in, a few a day. Staff hear about it in the Discord staff channel.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const input = parseNewTicket(await readBody(event), getRequestHeader(event, 'user-agent'))
  return createTicket(input, user, getRequestURL(event).origin)
})
