// Adds one screenshot (multipart "file": PNG, JPG or WebP, up to 4 MB) to your own report.
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  if (!screenshotsEnabled()) throw createError({ statusCode: 503, statusMessage: 'Screenshots are not set up on this dashboard yet.' })
  const id = parseBugId(getRouterParam(event, 'id'))
  return addScreenshot(id, user, await readUploadedImage(event, ['image/png', 'image/jpeg', 'image/webp']))
})
