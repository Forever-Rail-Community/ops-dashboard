export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'help.publish')
  const category = await createCategory(parseCategoryInput(await readBody(event)))
  await helpSiteChanged(user, 'help.category.create', { slug: category.slug, name: category.name })
  return category
})
