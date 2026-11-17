// Reports a bug. Anyone signed in, a few a day. Screenshots are added afterwards, one per request.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return createBug(parseBugInput(await readBody(event)), user, getRequestURL(event).origin)
})
