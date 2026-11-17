// Publishes a draft: everyone sees it in What's new. { discord: true } also posts it to the Discord channel.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'updates.post')
  const id = parseUpdateId(getRouterParam(event, 'id'))
  const body = await readBody<{ discord?: unknown }>(event)
  const result = await publishUpdate(id, body?.discord === true, getRequestURL(event).origin)
  await logEvent(user, 'update.publish', { id, title: result.update.title, discord: result.discord })
  return result
})
