export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.agents')
  const id = getRouterParam(event, 'id')!
  const key = await replaceAgentKey(id)
  await logEvent(user, 'agents.key', { id })
  return { key }
})
