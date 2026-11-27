// The Discord bot's side of the dashboard: calls to Discord's API with the bot token, and checking that button and
// form events really come from Discord. Separate from server/utils/discord.ts, which posts through channel webhooks.
import { createPublicKey, timingSafeEqual, verify } from 'node:crypto'
import type { H3Event } from 'h3'

export function discordBotConfig() {
  const { discord, oauth } = useRuntimeConfig() as ReturnType<typeof useRuntimeConfig> & { oauth?: { discord?: { clientId?: string } } }
  return {
    token: discord.botToken,
    publicKey: discord.publicKey,
    ticketsChannelId: discord.ticketsChannelId,
    botSecret: discord.botSecret,
    guildId: discord.guildId,
    applicationId: oauth?.discord?.clientId ?? '',
    apiBase: discord.apiBase.replace(/\/$/, '')
  }
}

// Ticket threads need the bot token and the tickets channel; until both are set, tickets stay in the dashboard.
export const ticketThreadsEnabled = () => {
  const c = discordBotConfig()
  return Boolean(c.token && c.ticketsChannelId)
}

export class DiscordError extends Error {
  constructor(readonly status: number, readonly body: unknown) {
    super(`Discord answered ${status}`)
  }
}

// One call to Discord's API. Waits and retries once when rate limited; anything else that fails throws DiscordError.
export async function discordApi<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const { token, apiBase } = discordBotConfig()
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: { Authorization: `Bot ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    if (res.status === 429 && attempt === 0) {
      const wait = Number((await res.json().catch(() => ({})))?.retry_after ?? 1)
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000))
      continue
    }
    if (!res.ok) throw new DiscordError(res.status, await res.json().catch(() => null))
    return (res.status === 204 ? undefined : await res.json()) as T
  }
}

// Discord signs every interaction (button, form, command) with the application's key. Anything unsigned is refused.
export function verifyDiscordSignature(publicKeyHex: string, signatureHex: string, timestamp: string, body: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(publicKeyHex) || !/^[0-9a-f]{128}$/i.test(signatureHex)) return false
  try {
    const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(publicKeyHex, 'hex').toString('base64url') }, format: 'jwk' })
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, 'hex'))
  } catch {
    return false
  }
}

// The name the dashboard uses for someone: server nickname, then display name, then username (as at sign-in).
export function discordMemberName(member: { nick?: string | null; user?: { username: string; global_name?: string | null } } | undefined, user?: { username: string; global_name?: string | null }) {
  const u = member?.user ?? user
  return member?.nick || u?.global_name || u?.username || 'Someone'
}

// Whether someone in Discord is ticket staff. Discord gives their Discord role IDs, which map to the dashboard's
// roles the same way as at sign-in (Admin > Access).
export async function discordMemberIsTicketStaff(userId: string, discordRoleIds: string[]) {
  return (await resolveAccess(userId, discordRoleIds))?.permissions.includes('tickets.manage') ?? false
}

// The always-on bot (bot/) calls the dashboard with the shared secret. Refused when it's unset or wrong.
export function requireBotSecret(event: H3Event) {
  const { botSecret } = discordBotConfig()
  const given = Buffer.from((getRequestHeader(event, 'authorization') ?? '').replace(/^Bearer /, ''))
  const expected = Buffer.from(botSecret)
  if (!botSecret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unknown bot' })
  }
}
