// Saves an update's title and changes; a posted one's Discord message is edited to match.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'updates.post')
  const id = parseUpdateId(getRouterParam(event, 'id'))
  const result = await saveUpdate(id, parseUpdateInput(await readBody(event)), getRequestURL(event).origin)
  if (result.update.publishedAt) await logEvent(user, 'update.edit', { id, title: result.update.title })
  return result
})
