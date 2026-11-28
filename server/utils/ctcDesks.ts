import type { TransactionSql } from 'postgres'

// Desks (shared/types/ctcDesks.ts): saved in the database, which changes only when someone clocks in or out, a desk is
// handed over (server/utils/ctcDeskRequests.ts), or staff edit the desks, and read through remember() so open boards
// don't keep Neon awake. The copy is read from Redis every time (no memory copy), so a desk taken through one server
// instance shows at once on the others.
//
// Whether a dispatcher is still here is a Redis key per dispatcher, written by any open page of the site every
// DESK_BEAT_SEC (app/composables/useDeskBeat.ts). Someone gone for DESK_AWAY_SEC is taken off their desk, and Discord
// is told; that's checked when desks are read and as game servers report, at most every CHECK_EVERY_MS per server
// instance. Each check-in also says how long since they last used the site, so a line set to take idle dispatchers
// off (its idleMinutes, on Edit desks) can.

const COPY = 'ctc-desks'
const SETTINGS_KEY = 'ctc-desks' // in the settings table: { lines: { [lineId]: CtcDeskSettings } }
const CHANGES_HOURS = 24
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
    const changes = await sql<{ line_id: string; at: Date; kind: CtcDeskChangeKind; text: string }[]>`
      SELECT line_id, at, kind, text FROM ctc_desk_changes WHERE at > now() - make_interval(hours => ${CHANGES_HOURS}) ORDER BY at DESC LIMIT 100`
    const [settings] = await sql<{ value: { lines?: Record<string, CtcDeskSettings> } }[]>`SELECT value FROM settings WHERE key = ${SETTINGS_KEY}`
    return {
      desks: rows.map((r) => ({
        id: r.id,
        lineId: r.line_id,
        name: r.name,
        start: r.start,
        holder: r.holder_id ? { userId: r.holder_id, name: r.holder_name ?? '', since: r.held_since!.toISOString() } : null,
        note: r.note
      })),
      changes: changes.map((c) => ({ lineId: c.line_id, at: c.at.toISOString(), kind: c.kind, text: c.text })),
      settings: settings?.value.lines ?? {}
    }
  }, { memory: false })

// Records a request's step in the Desk changes timeline, with no change to the desks.
export const recordDeskChange = (lineId: string, kind: CtcDeskChangeKind, text: string) => change(lineId, kind, text, async () => {})

// Runs a change and records it in the Desk changes timeline, then drops the remembered copy.
async function change(lineId: string, kind: CtcDeskChangeKind, text: string, run: (tx: TransactionSql) => Promise<unknown>) {
  const sql = await db()
  await sql.begin(async (tx) => {
    await run(tx)
    await tx`INSERT INTO ctc_desk_changes (line_id, kind, text) VALUES (${lineId}, ${kind}, ${text})`
  })
  await forget(COPY)
}

export async function findDesk(id: unknown) {
  const desk = typeof id === 'string' ? (await listDesks()).desks.find((d) => d.id === id) : undefined
  if (!desk) throw createError({ statusCode: 404, statusMessage: 'No such desk.' })
  return desk
}

export async function beat(userId: string) {
  await useStorage('data').setItem(beatKey(userId), Date.now(), { ttl: DESK_AWAY_SEC })
}

// A check-in from an open page: still here, and idleSec since they last used the site. Writes the beat for someone on
// a desk (one Redis command), or takes them off if their line's idle limit has passed.
export async function checkIn(user: { id: string; name: string }, idleSec: unknown): Promise<{ onDesk: boolean; takenOff?: string }> {
  const data = await listDesks()
  const held = data.desks.filter((d) => d.holder?.userId === user.id)
  if (!held.length) return { onDesk: false }
  const idle = held.filter((d) => {
    const { idleMinutes } = deskSettings(data, d.lineId)
    return idleMinutes && typeof idleSec === 'number' && idleSec >= idleMinutes * 60
  })
  for (const desk of idle) await takeOff(desk, `after ${deskSettings(data, desk.lineId).idleMinutes} minutes with no activity`)
  if (idle.length === held.length) {
    const minutes = deskSettings(data, held[0]!.lineId).idleMinutes
    return { onDesk: false, takenOff: `You were clocked out of ${held.map((d) => d.name).join(' and ')} after ${minutes} minutes with no activity.` }
  }
  await beat(user.id)
  return { onDesk: true }
}

export async function takeDesk(id: unknown, user: { id: string; name: string }) {
  const desk = await findDesk(id)
  if (desk.holder) throw createError({ statusCode: 409, statusMessage: `${desk.holder.name} is on duty on ${desk.name}.` })
  await beat(user.id)
  const rules = await coverRules(desk)
  await change(desk.lineId, 'in', `${user.name} clocked in to ${desk.name}`, async (sql) => {
    await requireCover(sql, rules, desk, user.id)
    const taken = await sql`UPDATE ctc_desks SET holder_id = ${user.id}, holder_name = ${user.name}, held_since = now(), note = NULL
                            WHERE id = ${desk.id} AND holder_id IS NULL RETURNING id`
    if (!taken.length) throw createError({ statusCode: 409, statusMessage: `Another dispatcher has just clocked in to ${desk.name}.` })
  })
}

// Hands a desk from the dispatcher on it to someone else (an approved transfer or a staff takeover), if it's still
// theirs and the new dispatcher may cover it. False if it changed hands meanwhile.
export async function handOverDesk(desk: CtcDesk, from: { userId: string }, to: { userId: string; name: string }, kind: 'transfer' | 'takeover', text: string) {
  const rules = await coverRules(desk)
  try {
    await change(desk.lineId, kind, text, async (sql) => {
      await requireCover(sql, rules, desk, to.userId)
      const moved = await sql`UPDATE ctc_desks SET holder_id = ${to.userId}, holder_name = ${to.name}, held_since = now(), note = NULL
                              WHERE id = ${desk.id} AND holder_id = ${from.userId} RETURNING id`
      if (!moved.length) throw new DeskMoved()
    })
    await beat(to.userId)
    return true
  } catch (err) {
    if (err instanceof DeskMoved) return false
    throw err
  }
}
class DeskMoved extends Error {}

// Whether a dispatcher may be on this desk as well as their others (deskCoverProblem). The line and its limit are read
// first (the database client has one connection, which the transaction holds), then the line's desks with them
// locked, so two clock-ins at once can't both pass.
async function coverRules(desk: CtcDesk) {
  const line = (await listLines()).find((l) => l.id === desk.lineId)
  if (!line) throw createError({ statusCode: 404, statusMessage: 'No such line.' })
  return { line, maxDesks: deskSettings(await listDesks(), desk.lineId).maxDesks }
}
async function requireCover(sql: TransactionSql, rules: Awaited<ReturnType<typeof coverRules>>, desk: CtcDesk, userId: string) {
  const rows = await sql<{ id: string; start: string; holder_id: string | null }[]>`
    SELECT id, start, holder_id FROM ctc_desks WHERE line_id = ${desk.lineId} ORDER BY id FOR UPDATE`
  const desks = rows.map((r) => ({ ...desk, id: r.id, start: r.start, holder: r.holder_id ? { userId: r.holder_id, name: '', since: '' } : null }))
  const problem = deskCoverProblem(deskSpans(rules.line, desks), desk.id, userId, rules.maxDesks)
  if (problem) throw createError({ statusCode: 409, statusMessage: problem })
}

export function parseTurnoverNote(body: unknown) {
  const b = body as { items?: unknown; text?: unknown }
  const items = Array.isArray(b?.items) ? b.items.filter((i): i is string => typeof i === 'string').map((i) => i.trim().slice(0, 200)).filter(Boolean).slice(0, DESK_NOTE_ITEMS_MAX) : []
  const text = typeof b?.text === 'string' ? b.text.trim().slice(0, DESK_NOTE_MAX) : ''
  return { items, text }
}

export async function leaveDesk(id: unknown, user: { id: string; name: string }, note: { items: string[]; text: string }) {
  const desk = await findDesk(id)
  if (desk.holder?.userId !== user.id) throw createError({ statusCode: 409, statusMessage: `You are not on duty on ${desk.name}.` })
  const turnover: CtcTurnoverNote = { by: user.name, at: new Date().toISOString(), ...note }
  await release(desk, 'out', `${user.name} clocked out of ${desk.name}`, turnover)
}

// Takes whoever is on a desk off it, keeping a turnover note if there is one.
async function release(desk: CtcDesk, kind: CtcDeskChangeKind, text: string, note: CtcTurnoverNote | null) {
  await change(desk.lineId, kind, text, (sql) =>
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
    await takeOff(desk, 'after the Operations Center was closed for 2 minutes', lines)
  }
}

// Clocks a dispatcher out of their desk for the reason given ("after … minutes …"), and tells Discord.
async function takeOff(desk: CtcDesk, reason: string, lines?: CtcLine[]) {
  const who = desk.holder!.name
  const line = (lines ?? (await listLines())).find((l) => l.id === desk.lineId)?.name ?? 'the line'
  await release(desk, 'auto', `${who} was clocked out of ${desk.name} automatically ${reason}`, null)
  await discordPost('staff', {
    title: `${desk.name} (${line}) is now open`,
    description: `${who} was clocked out automatically ${reason}. The desk is worked from the in-game CTC panel until a dispatcher clocks in.`,
    color: await brandColor()
  })
}

// A line's rules from Edit desks. A rule that's missing gets its default.
function parseDeskSettings(body: unknown): CtcDeskSettings {
  const given = (body ?? {}) as Partial<Record<keyof CtcDeskSettings, unknown>>
  const { idleMinutes, maxDesks, sound } = { ...DEFAULT_DESK_SETTINGS, ...given }
  if (!DESK_IDLE_CHOICES.includes(idleMinutes as number)) throw bad('Choose how long with no activity from the list.')
  if (!Number.isInteger(maxDesks) || (maxDesks as number) < 1 || (maxDesks as number) > DESK_LINE_MAX) {
    throw bad(`Desks one dispatcher can be on must be a whole number from 1 to ${DESK_LINE_MAX}.`)
  }
  if (typeof sound !== 'boolean') throw bad('The sound rule must be on or off.')
  return { idleMinutes: idleMinutes as number, maxDesks: maxDesks as number, sound }
}

// Edit desks: replaces a line's desks and sets its rules. A removed desk takes its dispatcher off; the rest keep theirs.
export async function saveDesks(lineId: string, body: unknown, user: { name: string }) {
  const line = (await listLines()).find((l) => l.id === lineId)
  if (!line) throw createError({ statusCode: 404, statusMessage: 'No such line.' })
  const list = (body as { desks?: unknown })?.desks
  if (!Array.isArray(list) || !list.length || list.length > DESK_LINE_MAX) throw bad(`A line has 1 to ${DESK_LINE_MAX} desks.`)
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
  const settings = parseDeskSettings((body as { settings?: unknown })?.settings)

  const before = (await listDesks()).desks.filter((d) => d.lineId === lineId)
  const removed = before.filter((d) => !rows.some((r) => r.id === d.id))
  const text = [`${user.name} updated the desks`, ...removed.filter((d) => d.holder).map((d) => `${d.holder!.name} was clocked out of ${d.name}, which was removed`)].join('. ')
  await change(lineId, 'edit', text, async (sql) => {
    await sql`DELETE FROM ctc_desks WHERE line_id = ${lineId} AND NOT (id = ANY(${rows.map((r) => r.id)}))`
    for (const r of rows) {
      await sql`INSERT INTO ctc_desks (id, line_id, name, start) VALUES (${r.id}, ${lineId}, ${r.name}, ${r.start})
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, start = EXCLUDED.start WHERE ctc_desks.line_id = ${lineId}`
    }
    await sql`INSERT INTO settings (key, value, updated_by)
              VALUES (${SETTINGS_KEY}, ${sql.json({ lines: { [lineId]: settings } } as never)}, ${user.name})
              ON CONFLICT (key) DO UPDATE SET value = jsonb_set(settings.value, ARRAY['lines', ${lineId}], ${sql.json(settings as never)}, true),
                                              updated_at = now(), updated_by = EXCLUDED.updated_by`
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
  throw createError({ statusCode: 403, statusMessage: span ? `You are not on duty on ${span.desk.name}.` : 'That control point is not on any desk.' })
}
