export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const article = await publishArticle(parseArticleId(getRouterParam(event, 'id')), user)
  await helpSiteChanged(user, 'help.article.publish', { id: article.id, title: article.title })
  return article
})
