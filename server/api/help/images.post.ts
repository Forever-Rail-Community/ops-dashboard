// Images inside help articles. The editor puts the returned address in the article.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'help.edit')
  return { url: await storeUploadedImage(event, 'help') }
})
