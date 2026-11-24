// Saves a roadmap item. { announce: true } posts a column change to the Discord announcements channel.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'roadmap.manage')
  const id = parseRoadmapId(getRouterParam(event, 'id'), 'Roadmap item')
  const body = await readBody(event)
  const result = await saveRoadmapItem(id, parseRoadmapItemInput(body), body?.announce === true, getRequestURL(event).origin, user)
  if (result.moved) await logEvent(user, 'roadmap.move', { id, title: result.item.title, status: result.item.status })
  return result
})
