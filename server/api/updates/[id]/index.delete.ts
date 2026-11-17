// Deletes an update, and its Discord message if it was posted.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'updates.post')
  const result = await deleteUpdate(parseUpdateId(getRouterParam(event, 'id')))
  if (result.update.publishedAt) await logEvent(user, 'update.delete', { id: result.update.id, title: result.update.title })
  return result
})
