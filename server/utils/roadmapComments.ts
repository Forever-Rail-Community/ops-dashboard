// Comments on roadmap items. Anyone signed in can comment (up to ROADMAP_LIMITS.commentsPerDay a day) and delete
// their own; people with "roadmap.manage" can delete any, and their comments are marked Staff.

type Actor = { id: string; name: string }
type Row = { id: number; author_id: string; author_name: string; staff: boolean; body: string; created_at: Date }

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const toComment = (r: Row, viewerId: string): RoadmapComment => ({
  id: r.id,
  author: r.author_name,
  staff: r.staff,
  mine: r.author_id === viewerId,
  body: r.body,
  createdAt: r.created_at.toISOString()
})

export function parseCommentBody(body: any): string {
  const text = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!text || text.length > ROADMAP_LIMITS.comment) throw bad(`A comment must be 1 to ${ROADMAP_LIMITS.comment} characters`)
  return text
}

// Oldest first, like a conversation.
export async function listComments(itemId: number, viewerId: string): Promise<RoadmapComment[]> {
  const sql = await db()
  const rows = await sql<Row[]>`
    SELECT id, author_id, author_name, staff, body, created_at FROM roadmap_comments WHERE item_id = ${itemId} ORDER BY created_at`
  return rows.map((r) => toComment(r, viewerId))
}

export async function addComment(itemId: number, text: string, actor: Actor, staff: boolean): Promise<RoadmapComment> {
  const sql = await db()
  const [today] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM roadmap_comments WHERE author_id = ${actor.id} AND created_at > now() - interval '1 day'`
  if (!staff && (today?.n ?? 0) >= ROADMAP_LIMITS.commentsPerDay) throw bad('That’s the most comments for today. Try again tomorrow.')
  const [row] = await sql<Row[]>`
    INSERT INTO roadmap_comments (item_id, author_id, author_name, staff, body)
    SELECT ${itemId}, ${actor.id}, ${actor.name}, ${staff}, ${text} WHERE EXISTS (SELECT 1 FROM roadmap_items WHERE id = ${itemId})
    RETURNING id, author_id, author_name, staff, body, created_at`
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Roadmap item not found' })
  return toComment(row, actor.id)
}

export async function deleteComment(id: number, actor: Actor, staff: boolean) {
  const sql = await db()
  const [row] = await sql<{ id: number }[]>`
    DELETE FROM roadmap_comments WHERE id = ${id} AND (${staff} OR author_id = ${actor.id}) RETURNING id`
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
}
