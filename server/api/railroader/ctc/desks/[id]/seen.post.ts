// The page of the dispatcher on a desk has shown them a request for it. A staff takeover waits for this.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  await markRequestSeen(getRouterParam(event, 'id'), user)
  return { ok: true }
})
