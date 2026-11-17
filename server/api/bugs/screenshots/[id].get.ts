// A screenshot, for its reporter or staff. Never cached by shared caches: it's private.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const staff = (await livePermissions(user)).includes('bugs.manage')
  const file = await screenshotFile(parseBugId(getRouterParam(event, 'id')), user.id, staff)
  setHeaders(event, { 'Content-Type': file.contentType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-cache' })
  return file.stream
})
