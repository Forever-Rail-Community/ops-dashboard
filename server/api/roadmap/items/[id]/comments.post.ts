// Comments on a roadmap item. { body }
export default defineEventHandler(async (event): Promise<RoadmapComment> => {
  const { user } = await requireUserSession(event)
  const staff = (await livePermissions(user)).includes('roadmap.manage')
  return addComment(parseRoadmapId(getRouterParam(event, 'id'), 'Roadmap item'), parseCommentBody(await readBody(event)), user, staff)
})
