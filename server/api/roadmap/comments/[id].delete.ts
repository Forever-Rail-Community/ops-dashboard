// Deletes a comment: your own, or any with "roadmap.manage".
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const staff = (await livePermissions(user)).includes('roadmap.manage')
  const id = parseRoadmapId(getRouterParam(event, 'id'), 'Comment')
  await deleteComment(id, user, staff)
  if (staff) await logEvent(user, 'roadmap.comment.delete', { id })
  return { id }
})
