// What the bug report form needs to know: whether screenshots can be added.
export default defineEventHandler(async (event) => {
  await requireUserSession(event)
  return { screenshots: screenshotsEnabled() }
})
