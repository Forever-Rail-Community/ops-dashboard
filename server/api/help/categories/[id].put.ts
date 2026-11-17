export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const categoryId = parseHelpCategoryId(getRouterParam(event, 'id'))
  const category = await updateHelpCategory(categoryId, parseHelpCategoryInput(await readBody(event)))
  await helpSiteChanged(user, 'help.category.update', { slug: category.slug, name: category.name })
  return category
})
