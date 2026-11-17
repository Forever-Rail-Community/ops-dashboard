// Suggests a feature. Anyone signed in, a few a day.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  return createRequest(parseRequestInput(await readBody(event)), user, getRequestURL(event).origin)
})
