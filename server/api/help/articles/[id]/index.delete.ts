export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const article = await deleteArticle(parseArticleId(getRouterParam(event, 'id')))
  const detail = { id: article.id, title: article.title }
  if (article.publishedAt) await helpSiteChanged(user, 'help.article.delete', detail)
  else await logEvent(user, 'help.article.delete', detail)
  return { ok: true }
})
