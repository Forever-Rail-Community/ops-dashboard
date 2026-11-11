export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.settings')
  return await loadSite()
})
