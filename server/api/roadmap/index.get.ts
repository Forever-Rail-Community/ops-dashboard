// The roadmap, for anyone signed in.
export default defineEventHandler(async (event): Promise<RoadmapItem[]> => {
  const { user } = await requireUserSession(event)
  return listRoadmap(user.id)
})
