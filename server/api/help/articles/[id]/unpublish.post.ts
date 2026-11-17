export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const article = await unpublishHelpArticle(parseHelpArticleId(getRouterParam(event, 'id')))
  await helpSiteChanged(user, 'help.article.unpublish', { id: article.id, title: article.title })
  return article
})
