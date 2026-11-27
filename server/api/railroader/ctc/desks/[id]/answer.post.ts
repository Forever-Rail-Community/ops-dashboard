// The dispatcher on a desk answers a request for it: { approve: true } hands it over (for a takeover, at once), and
// { approve: false } declines.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const id = getRouterParam(event, 'id')
  const approve = ((await readBody(event)) as { approve?: unknown } | null)?.approve === true
  await answerRequest(id, user, approve)
  await logEvent(user, approve ? 'ctc.desk.approve' : 'ctc.desk.decline', { desk: id })
  return checkRequests(user)
})
