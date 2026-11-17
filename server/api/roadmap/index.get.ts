// The roadmap, for anyone signed in.
export default defineEventHandler(async (event): Promise<RoadmapItem[]> => {
  await requireUserSession(event)
  return listRoadmap()
})
