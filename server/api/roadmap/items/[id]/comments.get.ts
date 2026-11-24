// A roadmap item's comments, for anyone signed in.
export default defineEventHandler(async (event): Promise<RoadmapComment[]> => {
  const { user } = await requireUserSession(event)
  return listComments(parseRoadmapId(getRouterParam(event, 'id'), 'Roadmap item'), user.id)
})
