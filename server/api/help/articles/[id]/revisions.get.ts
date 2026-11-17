export default defineEventHandler(async (event) => {
  await requirePermission(event, 'help.edit')
  return await listHelpRevisions(parseHelpArticleId(getRouterParam(event, 'id')))
})
