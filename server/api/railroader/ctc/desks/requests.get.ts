// Checked every DESK_REQUEST_POLL_SEC by a page on a desk or waiting on a request: every open request, this
// dispatcher's notices, and whether they're on a desk. Settles any request that's due first.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  return checkRequests(user)
})
