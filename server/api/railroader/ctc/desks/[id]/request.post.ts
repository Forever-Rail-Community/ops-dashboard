// Requests a desk from the dispatcher on it, or with { takeover: true } (staff) takes it over.
export default defineEventHandler(async (event) => {
  const { user, permissions } = await requirePermission(event, 'ctc.control')
  const id = getRouterParam(event, 'id')
  const takeover = ((await readBody(event)) as { takeover?: unknown } | null)?.takeover === true
  await requestDesk(id, user, takeover, permissions)
  await logEvent(user, takeover ? 'ctc.desk.takeover' : 'ctc.desk.request', { desk: id })
  return checkRequests(user)
})
