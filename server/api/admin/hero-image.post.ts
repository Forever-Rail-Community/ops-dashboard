// The help site's hero image. Appearance puts the returned address in the settings form; it takes effect on save.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.settings')
  return { url: await storeUploadedImage(event, 'help-site') }
})
