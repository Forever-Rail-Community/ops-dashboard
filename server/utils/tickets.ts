// Support tickets. Anyone signed in can open one (TICKET_LIMITS.perDay a day) and follow it; people with
// "tickets.manage" (staff) see every ticket, reply, add internal notes, set the status and assign it.
// A ticket's history is its timeline (ticket_events). The submitter never sees internal notes or the context.

import type { TransactionSql } from 'postgres'

type Actor = { id: string; name: string }
// The database, or a transaction on it: helpers below take either.
type Query = Awaited<ReturnType<typeof db>> | TransactionSql

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const notFound = () => createError({ statusCode: 404, statusMessage: 'Ticket not found' })

// Whether this person is staff for tickets (checked from their roles as saved, like every permission).
export const canManageTickets = async (user: { id: string; roles?: string[] }) =>
  (await livePermissions(user)).includes('tickets.manage')

export function parseTicketId(value: unknown): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) throw notFound()
  return n
}

function text(value: unknown, field: string, max: number): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!s || s.length > max) throw bad(`${field} must be 1 to ${max} characters`)
  return s
}

// "Chrome on Windows" from a user agent, for staff. Only the browser and system, nothing more identifying.
export function browserName(userAgent: string | undefined): string {
  const ua = userAgent ?? ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : ''
  const system = /Windows/.test(ua) ? 'Windows' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : ''
  return [browser, system].filter(Boolean).join(' on ')
}

export function parseNewTicket(body: any, userAgent: string | undefined) {
  if (!TICKET_KINDS.some((k) => k.value === body?.kind)) throw bad('Pick what the ticket is about')
  if (!TICKET_GAMES.some((g) => g.value === body?.game)) throw bad('Pick a game')
  // The page they came from: a path inside the Operations Center, or nothing.
  const page = typeof body?.page === 'string' && /^\/[\w\-/]{0,200}$/.test(body.page) ? body.page : undefined
  return {
    kind: body.kind as TicketKind,
    game: body.game as TicketGame,
    subject: text(body?.subject, 'The subject', TICKET_LIMITS.subject),
    body: text(body?.body, 'The details', TICKET_LIMITS.body),
    context: { page, browser: browserName(userAgent) || undefined } satisfies TicketContext
  }
}

export const parseMessage = (body: any) => ({
  body: text(body?.body, 'The message', TICKET_LIMITS.body),
  note: body?.note === true
})

// Staff's changes: a status, and/or an assignee ({ id, name }, or null for nobody).
export function parseTicketChanges(body: any) {
  const changes: { status?: TicketStatus; assignee?: { id: string; name: string } | null } = {}
  if (body?.status !== undefined) {
    if (!TICKET_STATUSES.some((s) => s.value === body.status)) throw bad('Unknown status')
    changes.status = body.status
  }
  if (body?.assignee !== undefined) {
    const a = body.assignee
    if (a === null) changes.assignee = null
    else if (typeof a?.id === 'string' && /^\d{1,30}$/.test(a.id) && typeof a?.name === 'string' && a.name.trim()) {
      changes.assignee = { id: a.id, name: a.name.trim().slice(0, 80) }
    } else throw bad('Unknown assignee')
  }
  if (changes.status === undefined && changes.assignee === undefined) throw bad('Nothing to change')
  return changes
}

type TicketRow = {
  id: number
  kind: TicketKind
  game: TicketGame
  subject: string
  status: TicketStatus
  submitter_id: string
  submitter_name: string
  assignee_id: string | null
  assignee_name: string | null
  context: TicketContext
  preview: string | null
  created_at: Date
  updated_at: Date
}

type EventRow = {
  id: string // bigserial
  type: TicketEventType
  author_id: string
  author_name: string
  staff: boolean
  body: string
  data: { status?: TicketStatus; assignee?: { id: string; name: string } | null }
  via: string
  created_at: Date
}

const toSummary = (r: TicketRow, viewerId: string): TicketSummary => ({
  id: r.id,
  kind: r.kind,
  game: r.game,
  subject: r.subject,
  status: r.status,
  submitter: { id: r.submitter_id, name: r.submitter_name },
  assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name ?? '' } : null,
  mine: r.submitter_id === viewerId,
  preview: r.preview ?? '',
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString()
})

const toEvent = (r: EventRow): TicketEvent => ({
  id: Number(r.id),
  type: r.type,
  author: { id: r.author_id, name: r.author_name, staff: r.staff },
  body: r.body,
  ...(r.type === 'status' ? { status: r.data.status } : {}),
  ...(r.type === 'assigned' ? { assignee: r.data.assignee ?? null } : {}),
  via: r.via,
  createdAt: r.created_at.toISOString()
})

// The latest message (never a note), for lists.
const selectTickets = (sql: Query) => sql`
  SELECT t.*, (SELECT e.body FROM ticket_events e WHERE e.ticket_id = t.id AND e.type = 'message' ORDER BY e.id DESC LIMIT 1) AS preview
  FROM tickets t`

// The viewer's own tickets, or (staff) everyone's. Most recent activity first.
export async function listTickets(viewerId: string, all: boolean): Promise<TicketSummary[]> {
  const sql = await db()
  const rows = await sql<TicketRow[]>`${selectTickets(sql)} ${all ? sql`` : sql`WHERE t.submitter_id = ${viewerId}`} ORDER BY t.updated_at DESC`
  return rows.map((r) => toSummary(r, viewerId))
}

async function readTicket(sql: Query, id: number, viewerId: string, staff: boolean): Promise<Ticket> {
  const [row] = await sql<TicketRow[]>`${selectTickets(sql)} WHERE t.id = ${id}`
  if (!row || (!staff && row.submitter_id !== viewerId)) throw notFound()
  const events = await sql<EventRow[]>`
    SELECT id, type, author_id, author_name, staff, body, data, via, created_at FROM ticket_events
    WHERE ticket_id = ${id} ${staff ? sql`` : sql`AND type <> 'note'`}
    ORDER BY id`
  return { ...toSummary(row, viewerId), context: staff ? row.context : null, events: events.map(toEvent) }
}

// One ticket with its timeline, if the viewer may see it: their own, or any for staff.
export async function getTicket(id: number, viewerId: string, staff: boolean): Promise<Ticket> {
  return readTicket(await db(), id, viewerId, staff)
}

type EventInput = { type: TicketEventType; body?: string; data?: EventRow['data'] }

// Where something on a ticket was written. A Discord message keeps its ID, so it's never posted back to Discord.
export type TicketSource = { via: 'Operations Center' | 'Discord'; discordMessageId?: string }
const WEBSITE: TicketSource = { via: 'Operations Center' }

async function addEvent(sql: Query, ticketId: number, actor: Actor, staff: boolean, event: EventInput, source: TicketSource = WEBSITE) {
  await sql`
    INSERT INTO ticket_events (ticket_id, type, author_id, author_name, staff, body, data, via, discord_message_id)
    VALUES (${ticketId}, ${event.type}, ${actor.id}, ${actor.name}, ${staff}, ${event.body ?? ''}, ${sql.json((event.data ?? {}) as never)},
      ${source.via}, ${source.discordMessageId ?? null})`
}

// Sets the status, recording it on the timeline. No change, no event.
async function setStatus(sql: Query, ticket: { id: number; status: TicketStatus }, status: TicketStatus, actor: Actor, staff: boolean, source: TicketSource = WEBSITE) {
  if (ticket.status === status) return
  await sql`UPDATE tickets SET status = ${status} WHERE id = ${ticket.id}`
  await addEvent(sql, ticket.id, actor, staff, { type: 'status', data: { status } }, { via: source.via })
  ticket.status = status
}

export async function createTicket(input: ReturnType<typeof parseNewTicket>, actor: Actor, origin: string, source: TicketSource = WEBSITE): Promise<Ticket> {
  const sql = await db()
  const id = await sql.begin(async (tx) => {
    const [{ today } = { today: 0 }] = await tx<{ today: number }[]>`
      SELECT count(*)::int AS today FROM tickets WHERE submitter_id = ${actor.id} AND created_at > now() - interval '1 day'`
    if (today >= TICKET_LIMITS.perDay) {
      throw createError({ statusCode: 429, statusMessage: `You can open up to ${TICKET_LIMITS.perDay} tickets a day. Reply on an open ticket, or try again tomorrow.` })
    }
    const [row] = await tx<{ id: number }[]>`
      INSERT INTO tickets (kind, game, subject, submitter_id, submitter_name, context)
      VALUES (${input.kind}, ${input.game}, ${input.subject}, ${actor.id}, ${actor.name}, ${tx.json(input.context as never)})
      RETURNING id`
    await addEvent(tx, row!.id, actor, false, { type: 'opened' }, { via: source.via })
    await addEvent(tx, row!.id, actor, false, { type: 'message', body: input.body }, { via: source.via })
    return row!.id
  })
  const kind = TICKET_KINDS.find((k) => k.value === input.kind)!.label
  const game = TICKET_GAMES.find((g) => g.value === input.game)!.label
  await discordPost('staff', {
    title: `${ticketRef(id)}: ${input.subject}`,
    url: `${origin}/tickets/inbox?ticket=${id}`,
    color: await brandColor(),
    description: input.body.length > 500 ? `${input.body.slice(0, 500)}…` : input.body,
    footer: { text: `${kind} · ${game} · from ${actor.name}` }
  })
  return getTicket(id, actor.id, false)
}

// A message (or, for staff, an internal note). Replying moves the ticket along: the submitter's reply puts a waiting
// or solved ticket back in progress, and staff's first reply takes an open ticket into progress.
export async function addTicketMessage(id: number, input: ReturnType<typeof parseMessage>, actor: Actor, staff: boolean, source: TicketSource = WEBSITE): Promise<Ticket> {
  if (input.note && !staff) throw createError({ statusCode: 403, statusMessage: 'Only staff can add internal notes' })
  const sql = await db()
  return sql.begin(async (tx) => {
    const ticket = await readTicket(tx, id, actor.id, staff)
    const asSubmitter = ticket.submitter.id === actor.id
    await addEvent(tx, id, actor, staff && !asSubmitter, { type: input.note ? 'note' : 'message', body: input.body }, source)
    if (!input.note) {
      if (asSubmitter && (ticket.status === 'waiting' || ticket.status === 'solved')) await setStatus(tx, ticket, 'progress', actor, false, source)
      else if (!asSubmitter && ticket.status === 'open') await setStatus(tx, ticket, 'progress', actor, true, source)
    }
    await tx`UPDATE tickets SET updated_at = now() WHERE id = ${id}`
    return readTicket(tx, id, actor.id, staff)
  })
}

// Staff set the status and the assignee; assigning an open ticket also takes it into progress.
// The submitter may only mark their own ticket solved.
export async function updateTicket(id: number, changes: ReturnType<typeof parseTicketChanges>, actor: Actor, staff: boolean, source: TicketSource = WEBSITE) {
  const sql = await db()
  return sql.begin(async (tx) => {
    const before = await readTicket(tx, id, actor.id, staff)
    if (!staff && !(before.mine && changes.status === 'solved' && changes.assignee === undefined)) {
      throw createError({ statusCode: 403, statusMessage: 'Only staff can change this' })
    }
    const ticket = { id, status: before.status }
    if (changes.assignee !== undefined && changes.assignee?.id !== before.assignee?.id) {
      await tx`UPDATE tickets SET assignee_id = ${changes.assignee?.id ?? null}, assignee_name = ${changes.assignee?.name ?? null} WHERE id = ${id}`
      await addEvent(tx, id, actor, true, { type: 'assigned', data: { assignee: changes.assignee } }, { via: source.via })
      if (changes.assignee && changes.status === undefined && ticket.status === 'open') await setStatus(tx, ticket, 'progress', actor, true, source)
    }
    if (changes.status) await setStatus(tx, ticket, changes.status, actor, staff && !before.mine, source)
    await tx`UPDATE tickets SET updated_at = now() WHERE id = ${id}`
    return { before, ticket: await readTicket(tx, id, actor.id, staff) }
  })
}

// Who a ticket can be assigned to: the viewer, and staff who have worked on tickets before. (The dashboard keeps no
// list of everyone, so staff appear here once they've replied to or been assigned a ticket.)
export async function assignableStaff(viewer: Actor): Promise<{ id: string; name: string }[]> {
  const sql = await db()
  const rows = await sql<{ id: string; name: string }[]>`
    SELECT DISTINCT ON (id) id, name FROM (
      SELECT author_id AS id, author_name AS name, created_at AS at FROM ticket_events WHERE staff
      UNION ALL
      SELECT assignee_id, assignee_name, updated_at FROM tickets WHERE assignee_id IS NOT NULL
    ) people
    ORDER BY id, at DESC`
  const others = rows.filter((r) => r.id !== viewer.id).sort((a, b) => a.name.localeCompare(b.name))
  return [{ id: viewer.id, name: viewer.name }, ...others]
}
