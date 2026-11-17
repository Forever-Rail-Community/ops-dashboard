export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const category = await deleteCategory(parseCategoryId(getRouterParam(event, 'id')))
  await helpSiteChanged(user, 'help.category.delete', { slug: category.slug, name: category.name })
  return { ok: true }
})
