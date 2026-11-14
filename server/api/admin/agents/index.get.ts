export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.agents')
  return listAgents()
})
