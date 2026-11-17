export default defineEventHandler(async (event) => {
  await requirePermission(event, 'help.edit')
  return await listHelpArticles()
})
