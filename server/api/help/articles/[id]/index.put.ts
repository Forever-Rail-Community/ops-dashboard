// Saves the draft. The public copy only changes on publish, but moving a published article
// (new category, URL, game, section, or order) shows on the public site right away.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.edit')
  const articleId = parseArticleId(getRouterParam(event, 'id'))
  const before = await getArticle(articleId)
  const after = await saveArticle(articleId, parseArticleInput(await readBody(event)), user)

  const placement = (a: HelpPlacement) => [a.categoryId, a.slug, a.game, a.section, a.sortOrder].join('|')
  if (after.published && placement(before) !== placement(after)) {
    await helpSiteChanged(user, 'help.article.move', { id: articleId, title: after.published.title })
  }
  return after
})
