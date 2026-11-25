import type { H3Event } from 'h3'
// Game servers that run the agent, and their keys. A key is shown once when made; only its hash is kept.
import { createHash, randomBytes } from 'node:crypto'

export interface RegisteredAgent {
  id: string
  game: GameKey
}

const NAME = /^[a-z0-9][a-z0-9-]{1,39}$/

const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')
const newKey = () => `fra_${randomBytes(24).toString('base64url')}`
// The latest report of each kind is kept per server, under "<kind>:<server>".
const REPORT_KINDS = ['status', 'trains', 'trainhistory', 'switches', 'industries', 'signals', 'signallayout'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]
const reportKey = (kind: ReportKind, id: string) => `${kind}:${id}`
// Every server with its game and key hash, read on every report and live page refresh (see remember.ts).
const registry = () =>
  remember('agents', async () => {
    const sql = await db()
    return sql<(RegisteredAgent & { key_hash: string })[]>`SELECT id, game, key_hash FROM agents ORDER BY id`.then((rows) => [...rows])
  })

export function parseAgentInput(body: unknown): RegisteredAgent {
  const b = (body ?? {}) as Record<string, unknown>
  const id = typeof b.id === 'string' ? b.id.trim() : ''
  if (!NAME.test(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Use 2 to 40 lowercase letters, numbers, and dashes for the name.' })
  }
  if (!isGameKey(b.game)) throw createError({ statusCode: 400, statusMessage: 'Pick a game.' })
  return { id, game: b.game }
}

// The server whose key signs this request (Authorization: Bearer <key>). Refuses the request if there is none.
export async function requireAgent(event: H3Event): Promise<RegisteredAgent> {
  const header = getHeader(event, 'authorization') ?? ''
  const agent = await agentForKey(header.startsWith('Bearer ') ? header.slice(7) : '')
  if (!agent) {
    throw createError({ statusCode: 401, statusMessage: 'Unknown key. Check the key, or make a new one in Admin > Servers.' })
  }
  return agent
}

// A registered server by name, or null.
export async function findAgent(id: string | undefined): Promise<RegisteredAgent | null> {
  const found = (await registry()).find((a) => a.id === id)
  return found ? { id: found.id, game: found.game } : null
}

// Which server a key belongs to, or null if no server has it (wrong, or removed).
export async function agentForKey(key: string): Promise<RegisteredAgent | null> {
  if (!key) return null
  const hash = hashKey(key)
  const found = (await registry()).find((a) => a.key_hash === hash)
  return found ? { id: found.id, game: found.game } : null
}

export async function listAgents(): Promise<AgentInfo[]> {
  const sql = await db()
  const rows = await sql<{ id: string; game: GameKey; created_at: Date; created_by_name: string }[]>`
    SELECT id, game, created_at, created_by_name FROM agents ORDER BY game, id`
  const storage = useStorage('data')
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      game: r.game,
      createdAt: r.created_at.toISOString(),
      createdByName: r.created_by_name,
      lastReportAt: await lastReportAt(r.id)
    }))
  )
}

// Returns the new server's key. This is the only time it can be read.
export async function createAgent(agent: RegisteredAgent, actor: { id: string; name: string }): Promise<string> {
  const sql = await db()
  const key = newKey()
  const [created] = await sql`
    INSERT INTO agents (id, game, key_hash, created_by, created_by_name)
    VALUES (${agent.id}, ${agent.game}, ${hashKey(key)}, ${actor.id}, ${actor.name})
    ON CONFLICT (id) DO NOTHING RETURNING id`
  if (!created) throw createError({ statusCode: 409, statusMessage: 'A server with that name already exists.' })
  await forget('agents')
  return key
}

// Swaps a server's key for a new one; the old key stops working at once.
export async function replaceAgentKey(id: string): Promise<string> {
  const sql = await db()
  const key = newKey()
  const [updated] = await sql`UPDATE agents SET key_hash = ${hashKey(key)} WHERE id = ${id} RETURNING id`
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Server not found' })
  await forget('agents')
  return key
}

// Removes a server: its key stops working and its last reports are deleted.
export async function deleteAgent(id: string): Promise<void> {
  const sql = await db()
  const [removed] = await sql`DELETE FROM agents WHERE id = ${id} RETURNING id`
  if (!removed) throw createError({ statusCode: 404, statusMessage: 'Server not found' })
  await forget('agents')
  await Promise.all(REPORT_KINDS.map((kind) => useStorage('data').removeItem(reportKey(kind, id))))
}

export async function saveReport<Data>(kind: ReportKind, agent: RegisteredAgent, sentAt: string, data: Data) {
  const stored: StoredReport<Data> = { agentId: agent.id, game: agent.game, sentAt, receivedAt: Date.now(), data }
  await useStorage('data').setItem(reportKey(kind, agent.id), stored)
}

export async function readReport<Data>(kind: ReportKind, id: string): Promise<StoredReport<Data> | null> {
  return useStorage('data').getItem<StoredReport<Data>>(reportKey(kind, id))
}

// When a server last sent anything, of any kind.
async function lastReportAt(id: string): Promise<number | null> {
  const times = await Promise.all(REPORT_KINDS.map(async (kind) => (await readReport(kind, id))?.receivedAt ?? 0))
  return Math.max(...times) || null
}

// The latest report of one kind from every server registered for a game, with how old each is.
export async function latestReports<Data>(game: GameKey, kind: ReportKind, staleAfterSec: number) {
  const servers = (await registry()).filter((a) => a.game === game)
  const now = Date.now()
  const found = await Promise.all(servers.map(({ id }) => readReport<Data>(kind, id)))
  return found.flatMap((stored) => {
    if (!stored) return [] // registered, but hasn't sent this kind yet
    const ageSec = Math.max(0, Math.round((now - stored.receivedAt) / 1000))
    return [{ stored, ageSec, stale: ageSec > staleAfterSec }]
  })
}
