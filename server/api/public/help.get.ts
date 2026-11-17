// Public on purpose: the help site reads this when it builds. It holds published articles only.
// Not cached: a rebuild starts seconds after a publish, and a cached copy would rebuild the site without the change.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return await loadPublicHelp()
})
