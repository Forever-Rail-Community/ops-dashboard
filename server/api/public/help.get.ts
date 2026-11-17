// Public on purpose: the help site reads this when it builds. It holds published articles only.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60')
  return await loadPublicHelp()
})
