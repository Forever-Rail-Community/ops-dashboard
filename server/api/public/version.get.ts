// Public on purpose: every open page asks which release is live, to offer a refresh once a new one is out
// (UpdateAvailable.vue), including the sign-in page. It's only the version number. Not cached, so a release shows at once.
export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return { version: useRuntimeConfig().public.appVersion }
})
