import type { TransactionSql } from 'postgres'

// Desks (shared/types/ctcDesks.ts): saved in the database, which changes only when someone takes, leaves or edits a
// desk, and read through remember() so open boards don't keep Neon awake. Whether a dispatcher is still at the board
// is a Redis key per dispatcher, written by their open board or Desks page every DESK_BEAT_SEC (one command each).
// Someone gone for DESK_AWAY_SEC is taken off their desk, and Discord is told; that's checked when desks are read and
// as game servers report, at most every CHECK_EVERY_MS per server instance.

const COPY = 'ctc-desks'
const CHANGES_HOURS = 24
const MAX_DESKS = 12
const CHECK_EVERY_MS = 30_000
const beatKey = (userId: string) => `desk-beat:${userId}`
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

interface DeskRow {
  id: string
  line_id: string
  name: string
  start: string
  holder_id: string | null
  holder_name: string | null
  held_since: Date | null
  note: CtcTurnoverNote | null
}

export const listDesks = () =>
  remember<CtcDesksData>(COPY, async () => {
    const sql = await db()
    const rows = await sql<DeskRow[]>`SELECT id, line_id, name, start, holder_id, holder_name, held_since, note FROM ctc_desks ORDER BY name`
    const changes = await sql<{ line_id: string; at: Date; text: string }[]>`
      SELECT line_id, at, text FROM ctc_desk_changes WHERE at > now() - make_interval(hours => ${CHANGES_HOURS}) ORDER BY at DESC LIMIT 100`
    return {
      desks: rows.map((r) => ({
        id: r.id,
        lineId: r.line_id,
        name: r.name,
        start: r.start,
        holder: r.holder_id ? { userId: r.holder_id, name: r.holder_name ?? '', since: r.held_since!.toISOString() } : null,
        note: r.note
      })),
      changes: changes.map((c) => ({ lineId: c.line_id, at: c.at.toISOString(), text: c.text }))
    }
  })

// Runs a change and records it in the Desk changes list, then drops the remembered copy.
async function change(lineId: string, text: string, run: (tx: TransactionSql) => Promise<unknown>) {
  const sql = await db()
  await sql.begin(async (tx) => {
    await run(tx)
    await tx`INSERT INTO ctc_desk_changes (line_id, text) VALUES (${lineId}, ${text})`
  })
  await forget(COPY)
}

async function findDesk(id: unknown) {
  const desk = typeof id === 'string' ? (await listDesks()).desks.find((d) => d.id === id) : undefined
  if (!desk) throw createError({ statusCode: 404, statusMessage: 'No such desk.' })
  return desk
}

export async function beat(userId: string) {
  await useStorage('data').setItem(beatKey(userId), Date.now(), { ttl: DESK_AWAY_SEC })
}

export async function takeDesk(id: unknown, user: { id: string; name: string }) {
  const desk = await findDesk(id)
  if (desk.holder) throw createError({ statusCode: 409, statusMessage: `${desk.holder.name} is on ${desk.name}.` })
  await beat(user.id)
  try {
    await change(desk.lineId, `${user.name} took ${desk.name}`, async (sql) => {
      const taken = await sql`UPDATE ctc_desks SET holder_id = ${user.id}, holder_name = ${user.name}, held_since = now(), note = NULL
                              WHERE id = ${desk.id} AND holder_id IS NULL RETURNING id`
      if (!taken.length) throw createError({ statusCode: 409, statusMessage: `Someone else just took ${desk.name}.` })
    })
  } catch (err: any) {
    if (err?.code === '23505') throw createError({ statusCode: 409, statusMessage: 'Leave your desk first.' }) // the one-desk index
    throw err
  }
}

export function parseTurnoverNote(body: unknown) {
  const b = body as { items?: unknown; text?: unknown }
  const items = Array.isArray(b?.items) ? b.items.filter((i): i is string => typeof i === 'string').map((i) => i.trim().slice(0, 200)).filter(Boolean).slice(0, DESK_NOTE_ITEMS_MAX) : []
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, DESK_NOTE_MAX) : ''
  return { items, text }
}

export async function leaveDesk(id: unknown, user: { id: string; name: string }, note: { items: string[]; text: string }) {
  const desk = await findDesk(id)
  if (desk.holder?.userId !== user.id) throw createError({ statusCode: 409, statusMessage: `You're not on ${desk.name}.` })
  const turnover: CtcTurnoverNote = { by: user.name, at: new Date().toISOString(), ...note }
  await release(desk, `${user.name} left ${desk.name}`, turnover)
}

// Takes whoever is on a desk off it, keeping a turnover note if there is one.
async function release(desk: CtcDesk, text: string, note: CtcTurnoverNote | null) {
  await change(desk.lineId, text, (sql) =>
    sql`UPDATE ctc_desks SET holder_id = NULL, holder_name = NULL, held_since = NULL, note = ${note ? sql.json(note as never) : null}
        WHERE id = ${desk.id} AND holder_id = ${desk.holder!.userId}`)
}

// Takes dispatchers who've been away for DESK_AWAY_SEC off their desks, and tells Discord.
let lastCheck = 0
export async function releaseAwayDispatchers() {
  if (Date.now() - lastCheck < CHECK_EVERY_MS) return
  lastCheck = Date.now()
  const { desks } = await listDesks()
  const held = desks.filter((d) => d.holder)
  if (!held.length) return
  const storage = useStorage('data')
  const lines = await listLines()
  for (const desk of held) {
    const at = await storage.getItem<number>(beatKey(desk.holder!.userId))
    if (typeof at === 'number' && Date.now() - at < DESK_AWAY_SEC * 1000) continue
    const line = lines.find((l) => l.id === desk.lineId)?.name ?? 'the line'
    await release(desk, `${desk.holder!.name} was taken off ${desk.name}, away from the board for 2 minutes`, null)
    await discordPost('staff', {
      title: `${desk.name} on the ${line} is open`,
      description: `${desk.holder!.name} has been away from the CTC board for 2 minutes. It's worked from the game's own CTC panel until someone takes it.`,
      color: await brandColor()
    })
  }
}

// Edit desks: replaces a line's desks. A removed desk takes its dispatcher off; the rest keep theirs.
export async function saveDesks(lineId: string, body: unknown, user: { name: string }) {
  const line = (await listLines()).find((l) => l.id === lineId)
  if (!line) throw createError({ statusCode: 404, statusMessage: 'No such line.' })
  const list = (body as { desks?: unknown })?.desks
  if (!Array.isArray(list) || !list.length || list.length > MAX_DESKS) throw bad(`A line has 1 to ${MAX_DESKS} desks.`)
  const points = line.towns.flatMap((t) => t.controlPoints)
  const rows = list.map((d: any, k: number) => {
    const name = typeof d?.name === 'string' ? d.name.trim().slice(0, 40) : ''
    if (!name) throw bad('Every desk needs a name.')
    const start = k === 0 ? points[0]! : d?.start
    if (typeof start !== 'string' || !points.includes(start)) throw bad(`${name} doesn't start on the line.`)
    return { id: typeof d?.id === 'string' && d.id ? d.id : crypto.randomUUID(), name, start }
  })
  if (new Set(rows.map((r) => r.name.toLowerCase())).size < rows.length) throw bad('Two desks have the same name.')
  if (new Set(rows.map((r) => r.start)).size < rows.length) throw bad('Two desks start at the same place.')

  const before = (await listDesks()).desks.filter((d) => d.lineId === lineId)
  const removed = before.filter((d) => !rows.some((r) => r.id === d.id))
  const text = [`${user.name} changed the desks`, ...removed.filter((d) => d.holder).map((d) => `${d.holder!.name} was taken off ${d.name}, which was removed`)].join('. ')
  await change(lineId, text, async (sql) => {
    await sql`DELETE FROM ctc_desks WHERE line_id = ${lineId} AND NOT (id = ANY(${rows.map((r) => r.id)}))`
    for (const r of rows) {
      await sql`INSERT INTO ctc_desks (id, line_id, name, start) VALUES (${r.id}, ${lineId}, ${r.name}, ${r.start})
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start = EXCLUDED.start WHERE ctc_desks.line_id = ${lineId}`
    }
  })
}

// A command from the board must be for a desk its sender is on. A line with no desks set up is worked as one, by
// anyone who can control the board.
export async function requireDeskFor(cp: string, user: { id: string }) {
  const line = (await listLines()).find((l) => l.towns.some((t) => t.controlPoints.includes(cp)))
  if (!line) return
  const spans = deskSpans(line, (await listDesks()).desks.filter((d) => d.lineId === line.id))
  if (!spans.length) return
  const span = spans.find((s) => s.controlPoints.includes(cp))
  if (span?.desk.holder?.userId === user.id) return
  throw createError({ statusCode: 403, statusMessage: span ? `${span.desk.name} isn't your desk.` : 'That control point isn\'t on a desk.' })
}
