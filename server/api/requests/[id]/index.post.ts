// What staff do with a request: accept (onto the roadmap), decline with a reason, merge into another, reply, hide
// or show, or reopen a declined one.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'roadmap.manage')
  const id = parseRoadmapId(getRouterParam(event, 'id'), 'Request')
  const act = parseRequestAction(await readBody(event))
  const result = await actOnRequest(id, act, user)
  if (act.action !== 'reply' && act.action !== 'hide') await logEvent(user, `request.${act.action}`, { id, title: result.request.title })
  return result
})
