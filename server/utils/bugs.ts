// Bug reports. Anyone signed in can report (BUG_LIMITS.perDay a day) and add screenshots to their own report.
// Reports are private: the reporter sees theirs, people with "bugs.manage" see all and answer them (status, reply,
// link to a roadmap item) or delete them. New reports go to the Discord staff channel.

type Actor = { id: string; name: string }

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const notFound = () => createError({ statusCode: 404, statusMessage: 'Bug report not found' })

export function parseBugId(value: unknown): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) throw notFound()
  return n
}

function text(value: unknown, field: string, max: number, required = true): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if ((required && !s) || s.length > max) throw bad(`${field} must be ${required ? '1' : '0'} to ${max} characters`)
  return s
}

export function parseBugInput(body: any) {
  const area = typeof body?.area === 'string' ? body.area : ''
  if (!BUG_AREAS.includes(area)) throw bad('Pick where the problem is')
  return {
    title: text(body?.title, "What's wrong", BUG_LIMITS.title),
    body: text(body?.body, 'What happened', BUG_LIMITS.body),
    area
  }
}

// Staff's changes: any of status, reply, roadmap item (null to unlink).
export function parseBugTriage(body: any) {
  const changes: { status?: BugStatus; reply?: string; roadmapItemId?: number | null } = {}
  if (body?.status !== undefined) {
    if (!BUG_STATUSES.some((s) => s.value === body.status)) throw bad('Unknown status')
    changes.status = body.status
  }
  if (body?.reply !== undefined) changes.reply = text(body.reply, 'The reply', BUG_LIMITS.reply, false)
  if (body?.roadmapItemId !== undefined) {
    if (body.roadmapItemId !== null && (!Number.isSafeInteger(body.roadmapItemId) || body.roadmapItemId < 1)) throw bad('Unknown roadmap item')
    changes.roadmapItemId = body.roadmapItemId
  }
  return changes
}

type Row = {
  id: number
  title: string
  body: string
  area: string
  author_id: string
  author_name: string
  status: BugStatus
  reply: string
  roadmap_item_id: number | null
  roadmap_title: string | null
  screenshots: number[]
  created_at: Date
  updated_at: Date
}

const toReport = (r: Row, viewerId: string): BugReport => ({
  id: r.id,
  title: r.title,
  body: r.body,
  area: r.area,
  author: r.author_name,
  mine: r.author_id === viewerId,
  status: r.status,
  reply: r.reply,
  roadmapItem: r.roadmap_item_id ? { id: r.roadmap_item_id, title: r.roadmap_title ?? '' } : null,
  screenshots: r.screenshots,
  createdAt: r.created_at.toISOString(),
  updatedAt: r.updated_at.toISOString()
})

const SELECT = `
  SELECT b.id, b.title, b.body, b.area, b.author_id, b.author_name, b.status, b.reply, b.roadmap_item_id,
    i.title AS roadmap_title, b.created_at, b.updated_at,
    COALESCE((SELECT array_agg(s.id ORDER BY s.id) FROM bug_screenshots s WHERE s.report_id = b.id), '{}') AS screenshots
  FROM bug_reports b
  LEFT JOIN roadmap_items i ON i.id = b.roadmap_item_id`

// The reporter's own reports, or (for staff) everyone's. Newest first.
export async function listBugs(viewerId: string, all: boolean): Promise<BugReport[]> {
  const sql = await db()
  const rows = await sql.unsafe<Row[]>(`${SELECT} ${all ? '' : 'WHERE b.author_id = $1'} ORDER BY b.created_at DESC`, all ? [] : [viewerId])
  return rows.map((r) => toReport(r, viewerId))
}

// One report, if the viewer may see it: their own, or any for staff.
export async function getBug(id: number, viewerId: string, staff: boolean): Promise<BugReport> {
  const sql = await db()
  const [row] = await sql.unsafe<Row[]>(`${SELECT} WHERE b.id = $1`, [id])
  if (!row || (!staff && row.author_id !== viewerId)) throw notFound()
  return toReport(row, viewerId)
}

export async function createBug(input: ReturnType<typeof parseBugInput>, actor: Actor, origin: string) {
  const sql = await db()
  const [{ today } = { today: 0 }] = await sql<{ today: number }[]>`
    SELECT count(*)::int AS today FROM bug_reports WHERE author_id = ${actor.id} AND created_at > now() - interval '1 day'`
  if (today >= BUG_LIMITS.perDay) {
    throw createError({ statusCode: 429, statusMessage: `You can report up to ${BUG_LIMITS.perDay} bugs a day. Try again tomorrow.` })
  }
  const [{ id } = { id: 0 }] = await sql<{ id: number }[]>`
    INSERT INTO bug_reports (title, body, area, author_id, author_name)
    VALUES (${input.title}, ${input.body}, ${input.area}, ${actor.id}, ${actor.name})
    RETURNING id`
  await discordPost('staff', {
    title: `Bug report #${id}: ${input.title}`,
    url: `${origin}/bugs?tab=all&report=${id}`,
    color: await brandColor(),
    description: input.body.length > 500 ? `${input.body.slice(0, 500)}…` : input.body,
    footer: { text: `${input.area} · from ${actor.name}` }
  })
  return getBug(id, actor.id, false)
}

// Adds a screenshot to the reporter's own report, up to the limit.
export async function addScreenshot(id: number, actor: Actor, image: { data: Buffer; type: string; extension: string }) {
  const report = await getBug(id, actor.id, false)
  if (!report.mine) throw notFound()
  if (report.screenshots.length >= BUG_LIMITS.screenshots) throw bad(`Up to ${BUG_LIMITS.screenshots} screenshots per report`)
  const pathname = `bug-reports/${id}/${crypto.randomUUID()}.${image.extension}`
  await saveScreenshot(pathname, image.data, image.type)
  const sql = await db()
  await sql`INSERT INTO bug_screenshots (report_id, pathname, content_type, size) VALUES (${id}, ${pathname}, ${image.type}, ${image.data.length})`
  return getBug(id, actor.id, false)
}

// A screenshot's file, if the viewer may see its report.
export async function screenshotFile(screenshotId: number, viewerId: string, staff: boolean) {
  const sql = await db()
  const [row] = await sql<{ pathname: string; author_id: string }[]>`
    SELECT s.pathname, b.author_id FROM bug_screenshots s JOIN bug_reports b ON b.id = s.report_id WHERE s.id = ${screenshotId}`
  if (!row || (!staff && row.author_id !== viewerId)) throw notFound()
  const file = await readScreenshot(row.pathname)
  if (!file) throw notFound()
  return file
}

export async function triageBug(id: number, changes: ReturnType<typeof parseBugTriage>, actor: Actor) {
  const before = await getBug(id, actor.id, true)
  const sql = await db()
  await sql`
    UPDATE bug_reports SET
      status = ${changes.status ?? before.status},
      reply = ${changes.reply ?? before.reply},
      roadmap_item_id = ${changes.roadmapItemId === undefined ? (before.roadmapItem?.id ?? null) : changes.roadmapItemId},
      updated_at = now()
    WHERE id = ${id}`
  return { before, report: await getBug(id, actor.id, true) }
}

// Deletes a report and its screenshots (spam, or reported by mistake).
export async function deleteBug(id: number, actor: Actor) {
  const report = await getBug(id, actor.id, true)
  const sql = await db()
  const shots = await sql<{ pathname: string }[]>`SELECT pathname FROM bug_screenshots WHERE report_id = ${id}`
  await deleteScreenshots(shots.map((s) => s.pathname))
  await sql`DELETE FROM bug_reports WHERE id = ${id}`
  return report
}
