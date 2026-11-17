// Goes back to the live version, dropping unpublished edits. Changes nothing on the public site.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.edit')
  return await discardHelpDraft(parseHelpArticleId(getRouterParam(event, 'id')), user)
})
