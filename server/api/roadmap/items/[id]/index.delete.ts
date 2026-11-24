// Removes a roadmap item; a request it came from opens again.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'roadmap.manage')
  const item = await deleteRoadmapItem(parseRoadmapId(getRouterParam(event, 'id'), 'Roadmap item'))
  await logEvent(user, 'roadmap.remove', { id: item.id, title: item.title })
  return item
})
