// Whether the Operations Center can reach its database and its shared storage (Redis), for uptime checks (Checkly,
// __checks__/). Public on purpose, and it says only up or down for each. 503 when either is down.
const check = async (probe: () => Promise<unknown>) => {
  try {
    await probe()
    return true
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const [database, storage] = await Promise.all([
    check(async () => (await db())`SELECT 1`),
    check(() => useStorage('data').getItem('health'))
  ])
  if (!database || !storage) setResponseStatus(event, 503)
  return { ok: database && storage, database, storage, version: useRuntimeConfig().public.appVersion }
})
