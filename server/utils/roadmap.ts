// The roadmap and feature requests. Anyone signed in can suggest features (up to ROADMAP_LIMITS.requestsPerDay a
// day) and give each request one vote. People with "roadmap.manage" keep the roadmap and answer requests:
// accepting one puts it on the roadmap (its votes show there), declining gives a reason, merging moves its votes to
// another request. Roadmap status changes go to the Discord announcements channel; new requests to the staff one.

type Actor = { id: string; name: string }

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const notFound = (what: string) => createError({ statusCode: 404, statusMessage: `${what} not found` })

const SCOPES = ROADMAP_SCOPES.map((s) => s.value)
const STATUSES = ROADMAP_COLUMNS.map((c) => c.value)
const scopeLabel = (scope: string) => ROADMAP_SCOPES.find((s) => s.value === scope)?.label ?? scope
const columnLabel = (status: string) => ROADMAP_COLUMNS.find((c) => c.value === status)?.label ?? status

// ---------------------------------------------------------------------------------------------------
// Checking input

function text(value: unknown, field: string, max: number, required = true): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if ((required && !s) || s.length > max) throw bad(`${field} must be ${required ? '1' : '0'} to ${max} characters`)
  return s
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) throw bad(`${field} must be one of: ${allowed.join(', ')}`)
  return value as T
}

export function parseRoadmapId(value: unknown, what: string): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) throw notFound(what)
  return n
}

export function parseRoadmapItemInput(body: any) {
  return {
    title: text(body?.title, 'The title', ROADMAP_LIMITS.title),
    description: text(body?.description, 'The description', ROADMAP_LIMITS.body, false),
    scope: oneOf(body?.scope, SCOPES, 'Scope'),
    status: oneOf(body?.status ?? 'planned', STATUSES, 'Status')
  }
}

export function parseRequestInput(body: any) {
  return {
    title: text(body?.title, 'The title', ROADMAP_LIMITS.title),
    body: text(body?.body, 'The description', ROADMAP_LIMITS.body, false),
    scope: oneOf(body?.scope, SCOPES, 'Where it would go')
  }
}

// ---------------------------------------------------------------------------------------------------
// The roadmap

type ItemRow = {
  id: number
  title: string
  description: string
  scope: RoadmapScope
  status: RoadmapStatus
  updated_at: Date
  votes: number
  requested_by: string | null
  update_id: number | null
  update_title: string | null
  update_published_at: Date | null
  bug_fix: boolean
}

const toItem = (r: ItemRow): RoadmapItem => ({
  id: r.id,
  title: r.title,
  description: r.description,
  scope: r.scope,
  status: r.status,
  votes: r.votes,
  requestedBy: r.requested_by,
  shippedIn: r.update_id && r.update_published_at ? { id: r.update_id, title: r.update_title!, publishedAt: r.update_published_at.toISOString() } : null,
  bugFix: r.bug_fix,
  updatedAt: r.updated_at.toISOString()
})

const ITEM_SELECT = `
  SELECT i.id, i.title, i.description, i.scope, i.status, i.updated_at,
    (SELECT count(*)::int FROM feature_votes v WHERE v.request_id = i.request_id) AS votes,
    r.author_name AS requested_by,
    u.id AS update_id, u.title AS update_title, u.published_at AS update_published_at,
    EXISTS (SELECT 1 FROM bug_reports b WHERE b.roadmap_item_id = i.id) AS bug_fix
  FROM roadmap_items i
  LEFT JOIN feature_requests r ON r.id = i.request_id
  LEFT JOIN updates u ON u.id = i.update_id`

// Every item; within a column, the most recently changed first.
export async function listRoadmap(): Promise<RoadmapItem[]> {
  const sql = await db()
  return (await sql.unsafe<ItemRow[]>(`${ITEM_SELECT} ORDER BY i.updated_at DESC`)).map(toItem)
}

async function getItem(id: number): Promise<RoadmapItem> {
  const sql = await db()
  const [row] = await sql.unsafe<ItemRow[]>(`${ITEM_SELECT} WHERE i.id = $1`, [id])
  if (!row) throw notFound('Roadmap item')
  return toItem(row)
}

// A status change worth announcing: "Grade panel is now In progress".
async function announceStatus(item: RoadmapItem, origin: string): Promise<DiscordOutcome> {
  const { outcome } = await discordPost('announcements', {
    title: `${item.title} is now ${columnLabel(item.status).toLowerCase()}`,
    url: `${origin}/roadmap`,
    color: await brandColor(),
    description: item.description || undefined,
    footer: { text: `Roadmap · ${scopeLabel(item.scope)}` }
  })
  return outcome
}

export async function createRoadmapItem(input: ReturnType<typeof parseRoadmapItemInput>, actor: Actor, requestId: number | null = null) {
  const sql = await db()
  const [{ id } = { id: 0 }] = await sql<{ id: number }[]>`
    INSERT INTO roadmap_items (title, description, scope, status, request_id, created_by)
    VALUES (${input.title}, ${input.description}, ${input.scope}, ${input.status}, ${requestId}, ${actor.id})
    RETURNING id`
  return getItem(id)
}

// Saves an item. Moving it to another column is announced on Discord when `announce` is set.
export async function saveRoadmapItem(id: number, input: ReturnType<typeof parseRoadmapItemInput>, announce: boolean, origin: string) {
  const before = await getItem(id)
  const sql = await db()
  await sql`
    UPDATE roadmap_items SET title = ${input.title}, description = ${input.description}, scope = ${input.scope},
      status = ${input.status}, updated_at = now()
    WHERE id = ${id}`
  const item = await getItem(id)
  const moved = before.status !== item.status
  const discord: DiscordOutcome = moved && announce ? await announceStatus(item, origin) : 'unchanged'
  return { item, moved, discord }
}

// Removes an item. If it came from a request, that request is open again (with its votes).
export async function deleteRoadmapItem(id: number) {
  const item = await getItem(id)
  const sql = await db()
  const [row] = await sql<{ request_id: number | null }[]>`DELETE FROM roadmap_items WHERE id = ${id} RETURNING request_id`
  if (row?.request_id) await sql`UPDATE feature_requests SET status = 'open' WHERE id = ${row.request_id}`
  return item
}

// Complete items not yet in a What's new update: what the update editor offers to add.
export async function listUnshippedComplete(): Promise<RoadmapItem[]> {
  const sql = await db()
  return (await sql.unsafe<ItemRow[]>(`${ITEM_SELECT} WHERE i.status = 'complete' AND i.update_id IS NULL ORDER BY i.updated_at DESC`)).map(toItem)
}

// When an update is published, the roadmap items it covers are marked as shipped in it.
export async function markShipped(updateId: number, itemIds: number[]) {
  if (!itemIds.length) return
  const sql = await db()
  await sql`UPDATE roadmap_items SET update_id = ${updateId} WHERE id = ANY(${itemIds}) AND update_id IS NULL`
}

// ---------------------------------------------------------------------------------------------------
// Feature requests

type RequestRow = {
  id: number
  title: string
  body: string
  scope: RoadmapScope
  author_id: string
  author_name: string
  created_at: Date
  status: RequestStatus
  reply: string
  hidden: boolean
  votes: number
  voted: boolean
  merged_into: number | null
  merged_title: string | null
}

const toRequest = (r: RequestRow, viewerId: string): FeatureRequest => ({
  id: r.id,
  title: r.title,
  body: r.body,
  scope: r.scope,
  author: r.author_name,
  mine: r.author_id === viewerId,
  createdAt: r.created_at.toISOString(),
  status: r.status,
  reply: r.reply,
  votes: r.votes,
  voted: r.voted,
  mergedInto: r.merged_into ? { id: r.merged_into, title: r.merged_title ?? '' } : null,
  hidden: r.hidden
})

const REQUEST_SELECT = `
  SELECT f.id, f.title, f.body, f.scope, f.author_id, f.author_name, f.created_at, f.status, f.reply, f.hidden,
    (SELECT count(*)::int FROM feature_votes v WHERE v.request_id = f.id) AS votes,
    EXISTS (SELECT 1 FROM feature_votes v WHERE v.request_id = f.id AND v.user_id = $1) AS voted,
    f.merged_into, m.title AS merged_title
  FROM feature_requests f
  LEFT JOIN feature_requests m ON m.id = f.merged_into`

// Requests for the board. Hidden ones only for staff; merged ones are left out (their votes moved).
export async function listRequests(viewerId: string, staff: boolean): Promise<FeatureRequest[]> {
  const sql = await db()
  const rows = await sql.unsafe<RequestRow[]>(
    `${REQUEST_SELECT} WHERE f.status <> 'merged' ${staff ? '' : 'AND NOT f.hidden'} ORDER BY f.created_at DESC`,
    [viewerId]
  )
  return rows.map((r) => toRequest(r, viewerId))
}

async function getRequest(id: number, viewerId = ''): Promise<FeatureRequest> {
  const sql = await db()
  const [row] = await sql.unsafe<RequestRow[]>(`${REQUEST_SELECT} WHERE f.id = $2`, [viewerId, id])
  if (!row) throw notFound('Request')
  return toRequest(row, viewerId)
}

export async function createRequest(input: ReturnType<typeof parseRequestInput>, actor: Actor, origin: string) {
  const sql = await db()
  const [{ today } = { today: 0 }] = await sql<{ today: number }[]>`
    SELECT count(*)::int AS today FROM feature_requests WHERE author_id = ${actor.id} AND created_at > now() - interval '1 day'`
  if (today >= ROADMAP_LIMITS.requestsPerDay) {
    throw createError({ statusCode: 429, statusMessage: `You can suggest up to ${ROADMAP_LIMITS.requestsPerDay} features a day. Try again tomorrow.` })
  }
  const [{ id } = { id: 0 }] = await sql<{ id: number }[]>`
    INSERT INTO feature_requests (title, body, scope, author_id, author_name)
    VALUES (${input.title}, ${input.body}, ${input.scope}, ${actor.id}, ${actor.name})
    RETURNING id`
  // The person asking votes for it.
  await sql`INSERT INTO feature_votes (request_id, user_id) VALUES (${id}, ${actor.id}) ON CONFLICT DO NOTHING`
  const { messageId } = await discordPost('staff', {
    title: `New feature request: ${input.title}`,
    url: `${origin}/roadmap?tab=requests`,
    color: await brandColor(),
    description: input.body || undefined,
    footer: { text: `${scopeLabel(input.scope)} · from ${actor.name}` }
  })
  if (messageId) await sql`UPDATE feature_requests SET discord_message_id = ${messageId} WHERE id = ${id}`
  return getRequest(id, actor.id)
}

// Votes for a request, or takes the vote back. Only open requests take votes.
export async function toggleVote(id: number, actor: Actor, on: boolean) {
  const request = await getRequest(id, actor.id)
  if (request.status !== 'open' && request.status !== 'accepted') throw bad('This request no longer takes votes')
  const sql = await db()
  if (on) await sql`INSERT INTO feature_votes (request_id, user_id) VALUES (${id}, ${actor.id}) ON CONFLICT DO NOTHING`
  else await sql`DELETE FROM feature_votes WHERE request_id = ${id} AND user_id = ${actor.id}`
  return getRequest(id, actor.id)
}

// What staff can do with a request.
export type RequestAction =
  | { action: 'accept'; status?: RoadmapStatus }
  | { action: 'decline'; reason: string }
  | { action: 'merge'; into: number }
  | { action: 'reply'; reply: string }
  | { action: 'hide'; hidden: boolean }
  | { action: 'reopen' }

export function parseRequestAction(body: any): RequestAction {
  switch (body?.action) {
    case 'accept':
      return { action: 'accept', status: body.status === undefined ? 'planned' : oneOf(body.status, STATUSES, 'Status') }
    case 'decline':
      return { action: 'decline', reason: text(body.reason, 'The reason', ROADMAP_LIMITS.reply) }
    case 'merge':
      return { action: 'merge', into: parseRoadmapId(body.into, 'Request to merge into') }
    case 'reply':
      return { action: 'reply', reply: text(body.reply, 'The reply', ROADMAP_LIMITS.reply, false) }
    case 'hide':
      return { action: 'hide', hidden: body.hidden === true }
    case 'reopen':
      return { action: 'reopen' }
    default:
      throw bad('Unknown action')
  }
}

export async function actOnRequest(id: number, act: RequestAction, actor: Actor) {
  const request = await getRequest(id, actor.id)
  const sql = await db()
  switch (act.action) {
    case 'accept': {
      if (request.status === 'accepted') throw bad('This request is already on the roadmap')
      const item = await createRoadmapItem({ title: request.title, description: request.body, scope: request.scope, status: act.status ?? 'planned' }, actor, id)
      await sql`UPDATE feature_requests SET status = 'accepted' WHERE id = ${id}`
      return { request: await getRequest(id, actor.id), item }
    }
    case 'decline':
      await sql`UPDATE feature_requests SET status = 'declined', reply = ${act.reason} WHERE id = ${id}`
      break
    case 'merge': {
      if (act.into === id) throw bad("A request can't be merged into itself")
      const target = await getRequest(act.into, actor.id)
      if (target.status === 'merged') throw bad('Merge into the request it was merged into instead')
      // Votes move to the other request; anyone who voted for both keeps one vote.
      await sql`
        INSERT INTO feature_votes (request_id, user_id) SELECT ${act.into}, user_id FROM feature_votes WHERE request_id = ${id}
        ON CONFLICT DO NOTHING`
      await sql`DELETE FROM feature_votes WHERE request_id = ${id}`
      await sql`UPDATE feature_requests SET status = 'merged', merged_into = ${act.into} WHERE id = ${id}`
      break
    }
    case 'reply':
      await sql`UPDATE feature_requests SET reply = ${act.reply} WHERE id = ${id}`
      break
    case 'hide':
      await sql`UPDATE feature_requests SET hidden = ${act.hidden} WHERE id = ${id}`
      break
    case 'reopen':
      // A merged request's votes have moved on, and an accepted one is on the roadmap: only a declined one reopens.
      if (request.status !== 'declined') throw bad('Only declined requests can be reopened')
      await sql`UPDATE feature_requests SET status = 'open' WHERE id = ${id}`
      break
  }
  return { request: await getRequest(id, actor.id) }
}
