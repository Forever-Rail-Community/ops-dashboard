import { createHash, timingSafeEqual } from 'node:crypto'

// Compare hashes so the check takes the same time whatever the key looks like.
const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

export default defineEventHandler(async (event) => {
  const { ingestKey } = useRuntimeConfig(event)
  const header = getHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!ingestKey || !token || !safeEqual(token, ingestKey)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const snapshot = parseSnapshot(await readBody(event))

  // receivedAt uses the server's clock, so a wrong clock on the game server can't hide an outage.
  await useStorage('data').setItem(`agent:${snapshot.agentId}`, {
    ...snapshot,
    receivedAt: Date.now()
  })

  return { ok: true }
})
