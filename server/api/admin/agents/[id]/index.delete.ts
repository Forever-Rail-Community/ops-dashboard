export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.agents')
  const id = getRouterParam(event, 'id')!
  await deleteAgent(id)
  await logEvent(user, 'agents.delete', { id })
  return { ok: true }
})
