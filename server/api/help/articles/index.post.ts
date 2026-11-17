// New articles start as drafts, so this changes nothing on the public site.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.edit')
  return await createArticle(parseArticleInput(await readBody(event)), user)
})
