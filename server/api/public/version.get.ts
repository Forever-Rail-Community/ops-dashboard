// Which release is live, so open pages can offer a refresh once a new one is out (UpdateAvailable.vue). Public on
// purpose: it's only the version number, and asking it shouldn't depend on the session. Not cached, so a release shows
// at once.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { version: useRuntimeConfig().public.appVersion }
})
