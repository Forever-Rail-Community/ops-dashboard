// Withdraws your request for a desk, or cancels your takeover.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const id = getRouterParam(event, 'id')
  await withdrawRequest(id, user)
  await logEvent(user, 'ctc.desk.withdraw', { desk: id })
  return checkRequests(user)
})
