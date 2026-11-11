// Public on purpose: the sign-in page needs the name, logo, and colors before anyone is signed in.
export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60')
  return await loadSite()
})
