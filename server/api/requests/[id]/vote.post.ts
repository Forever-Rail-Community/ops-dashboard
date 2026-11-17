// { vote: true } votes for a request; { vote: false } takes the vote back.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody<{ vote?: unknown }>(event)
  return toggleVote(parseRoadmapId(getRouterParam(event, 'id'), 'Request'), user, body?.vote === true)
})
