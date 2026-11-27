// Commands staff send to a game server (shared/types/serverCommands.ts). They're kept in Postgres as the server's
// command history. Reports arrive every few seconds and Postgres can sleep between uses, so a report only reaches
// Postgres when a small flag in Redis says a command is waiting for that server.

const MAX_TEXT = 200
export const COMMAND_HISTORY = 20
const MAX_ANSWERS = 20
const MAX_MESSAGE = 500
const ANSWER_STATES = ['pending', 'ok', 'refused', 'error'] as const
const flagKey = (agentId: string) => `commands-waiting:${agentId}`

interface CommandRow {
  id: string // bigserial comes back as a string
  agent_id: string
  text: string
  by_name: string
  created_at: Date
  state: ServerCommandState
  message: string
  sent_at: Date | null
  answered_at: Date | null
}

const COLUMNS = 'id, agent_id, text, by_name, created_at, state, message, sent_at, answered_at'

const toCommand = (r: CommandRow): ServerCommand => ({
  id: Number(r.id),
  agentId: r.agent_id,
  text: r.text,
  by: r.by_name,
  at: r.created_at.toISOString(),
  state: r.state,
  message: r.message,
  sentAt: r.sent_at?.toISOString() ?? null,
  answeredAt: r.answered_at?.toISOString() ?? null
})

// Commands only go to servers whose agent can carry them out.
export async function requireCommandServer(agentId: string | undefined): Promise<RegisteredAgent> {
  const agent = await findAgent(agentId)
  if (!agent) throw createError({ statusCode: 404, statusMessage: 'No such server' })
  if (agent.game !== 'railroader') throw createError({ statusCode: 400, statusMessage: 'This server can\'t take commands' })
  return agent
}

export function parseCommandText(body: unknown): string {
  const text = typeof (body as { text?: unknown })?.text === 'string' ? (body as { text: string }).text.trim().replace(/\s+/g, ' ') : ''
  if (!text) throw createError({ statusCode: 400, statusMessage: 'Type a command.' })
  if (text.length > MAX_TEXT) throw createError({ statusCode: 400, statusMessage: `Keep a command under ${MAX_TEXT} characters.` })
  return text
}

export async function queueCommand(agentId: string, text: string, user: { id: string; name: string }): Promise<ServerCommand> {
  const sql = await db()
  const [row] = await sql<CommandRow[]>`
    INSERT INTO server_commands (agent_id, text, by_id, by_name) VALUES (${agentId}, ${text}, ${user.id}, ${user.name})
    RETURNING ${sql.unsafe(COLUMNS)}`
  // Set after the row exists, so the agent never sees the flag before the command (see takeCommands).
  await useStorage('data').setItem(flagKey(agentId), Date.now())
  return toCommand(row!)
}

// A server's latest commands, newest first, or only those starting with `prefix` (the CTC board's, "ctc "). Ones the
// agent never picked up, or never answered, say so.
export async function listCommands(agentId: string, prefix = ''): Promise<ServerCommand[]> {
  const sql = await db()
  const rows = await sql<CommandRow[]>`
    SELECT ${sql.unsafe(COLUMNS)} FROM server_commands
    WHERE agent_id = ${agentId} AND starts_with(text, ${prefix}) ORDER BY id DESC LIMIT ${COMMAND_HISTORY}`
  const now = Date.now()
  return rows.map(toCommand).map((c) => {
    const ageSec = (now - Date.parse(c.at)) / 1000
    if (c.state === 'queued' && ageSec > COMMAND_PICKUP_SEC) {
      return { ...c, state: 'expired', message: '' }
    }
    if ((c.state === 'sent' || c.state === 'pending') && ageSec > COMMAND_ANSWER_SEC) {
      return { ...c, state: 'error', message: c.message || 'No answer.' }
    }
    return c
  })
}

// The commands waiting for this server, marked as sent. Called with each report; only reaches Postgres when the flag
// is set. The flag is cleared before reading, so a command queued meanwhile sets it again for the next report.
export async function takeCommands(agent: RegisteredAgent): Promise<{ id: number; text: string }[]> {
  const storage = useStorage('data')
  if (!(await storage.getItem(flagKey(agent.id)))) return []
  await storage.removeItem(flagKey(agent.id))
  const sql = await db()
  const rows = await sql<{ id: string; text: string }[]>`
    UPDATE server_commands SET state = 'sent', sent_at = now()
    WHERE agent_id = ${agent.id} AND state = 'queued' AND created_at > now() - make_interval(secs => ${COMMAND_PICKUP_SEC})
    RETURNING id, text`
  return rows.map((r) => ({ id: Number(r.id), text: r.text })).sort((a, b) => a.id - b.id)
}

// The agent's answers: [{ id, status: pending|ok|refused|error, message }]. Only this server's own commands change,
// and a final answer is never replaced by a late "pending".
export async function recordAnswers(agent: RegisteredAgent, data: unknown) {
  if (!Array.isArray(data)) throw createError({ statusCode: 400, statusMessage: 'Command answers must be a list' })
  const sql = await db()
  for (const a of data.slice(0, MAX_ANSWERS) as { id?: unknown; status?: unknown; message?: unknown }[]) {
    const id = Number(a?.id)
    if (!Number.isSafeInteger(id) || !ANSWER_STATES.includes(a.status as never)) continue
    const message = typeof a.message === 'string' ? a.message.slice(0, MAX_MESSAGE) : ''
    await sql`
      UPDATE server_commands SET state = ${a.status as string}, message = ${message}, answered_at = now()
      WHERE id = ${id} AND agent_id = ${agent.id} AND state IN ('sent', 'pending')`
  }
}
