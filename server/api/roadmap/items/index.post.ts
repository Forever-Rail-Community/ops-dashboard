// Adds a roadmap item.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'roadmap.manage')
  const item = await createRoadmapItem(parseRoadmapItemInput(await readBody(event)), user)
  await logEvent(user, 'roadmap.add', { id: item.id, title: item.title })
  return item
})
