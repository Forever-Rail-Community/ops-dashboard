// Copies of small things from the database that rarely change but are read on almost every request: the game
// servers and their key hashes (every report), and what each role may do (every page refresh). Reading the copy
// instead of the database lets Neon go idle while game servers report and people keep pages open.
//
// A copy lives in this instance's memory for a minute, and in Redis until the next change or deploy:
//   memory (up to MEMORY_TTL_MS old) -> Redis -> the database, which then fills Redis.
// Whatever changes the data calls forget(name): the Redis copy goes at once, other instances' memory within a minute.
// Copies are kept per deploy, so a migration that changes the data is picked up straight away.

const MEMORY_TTL_MS = 60_000
const inMemory = new Map<string, { value: unknown; until: number }>()
const redisKey = (name: string) => `copy:${useRuntimeConfig().public.appCommit || 'dev'}:${name}`

export async function remember<T extends object>(name: string, load: () => Promise<T>): Promise<T> {
  const hit = inMemory.get(name)
  if (hit && hit.until > Date.now()) return hit.value as T
  const storage = useStorage('data')
  let value = await storage.getItem<T>(redisKey(name))
  if (value === null) {
    value = await load()
    await storage.setItem(redisKey(name), value)
  }
  inMemory.set(name, { value, until: Date.now() + MEMORY_TTL_MS })
  return value
}

export async function forget(name: string) {
  inMemory.delete(name)
  await useStorage('data').removeItem(redisKey(name))
}
