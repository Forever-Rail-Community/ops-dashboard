// Features an article on the help site's home page, or stops featuring it: { featured: boolean }.
// Needs help.publish, since a published article's change shows on the public site right away.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const articleId = parseHelpArticleId(getRouterParam(event, 'id'))
  const { featured } = (await readBody(event)) ?? {}
  if (typeof featured !== 'boolean') throw createError({ statusCode: 400, statusMessage: 'featured must be true or false' })

  const before = await getHelpArticle(articleId)
  const after = await featureHelpArticle(articleId, featured)
  if (after.published && Boolean(before.featuredAt) !== featured) {
    await helpSiteChanged(user, featured ? 'help.article.feature' : 'help.article.unfeature', { id: articleId, title: after.published.title })
  }
  return after
})
