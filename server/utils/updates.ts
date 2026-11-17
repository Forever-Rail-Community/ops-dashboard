// What's new updates: written as drafts by people with "updates.post", then published. Publishing can also post the
// update to a Discord channel through a webhook (NUXT_DISCORD_UPDATES_WEBHOOK); editing or deleting a posted update
// changes or removes that message too. Discord failing never stops the update itself from saving.

type Actor = { id: string; name: string }
type Row = { id: number; title: string; changes: UpdateChange[]; published_at: Date | null; updated_at: Date; discord_message_id: string | null }

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const notFound = () => createError({ statusCode: 404, statusMessage: 'Update not found' })

const toUpdate = (r: Row): Update => ({
  id: r.id,
  title: r.title,
  changes: r.changes,
  publishedAt: r.published_at?.toISOString() ?? null,
  updatedAt: r.updated_at.toISOString(),
  onDiscord: Boolean(r.discord_message_id)
})

export function parseUpdateId(value: unknown): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) throw notFound()
  return n
}

export function parseUpdateInput(body: any): { title: string; changes: UpdateChange[] } {
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  if (!title || title.length > UPDATE_LIMITS.title) throw bad(`The title must be 1 to ${UPDATE_LIMITS.title} characters`)
  if (!Array.isArray(body?.changes) || body.changes.length > UPDATE_LIMITS.changes) throw bad(`Up to ${UPDATE_LIMITS.changes} changes`)
  const changes = body.changes.map((c: any, i: number) => {
    const text = typeof c?.text === 'string' ? c.text.trim() : ''
    const area = typeof c?.area === 'string' ? c.area.trim() : ''
    if (!text || text.length > UPDATE_LIMITS.text) throw bad(`Change ${i + 1} must be 1 to ${UPDATE_LIMITS.text} characters`)
    if (!UPDATE_AREAS.includes(area)) throw bad(`Change ${i + 1} needs one of the listed areas`)
    return { area, text }
  })
  return { title, changes }
}

const COLUMNS = 'id, title, changes, published_at, updated_at, discord_message_id'

// Everything, drafts first, then newest published: for the people who post updates.
export async function listAllUpdates(): Promise<Update[]> {
  const sql = await db()
  const rows = await sql.unsafe<Row[]>(`SELECT ${COLUMNS} FROM updates ORDER BY published_at DESC NULLS FIRST, updated_at DESC`)
  return rows.map(toUpdate)
}

// Published updates, newest first: what everyone sees.
export async function listPublishedUpdates(limit = 20): Promise<Update[]> {
  const sql = await db()
  const rows = await sql.unsafe<Row[]>(`SELECT ${COLUMNS} FROM updates WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT $1`, [limit])
  return rows.map(toUpdate)
}

async function getRow(id: number): Promise<Row> {
  const sql = await db()
  const [row] = await sql.unsafe<Row[]>(`SELECT ${COLUMNS} FROM updates WHERE id = $1`, [id])
  if (!row) throw notFound()
  return row
}

export async function createUpdate(input: { title: string; changes: UpdateChange[] }, actor: Actor): Promise<Update> {
  const sql = await db()
  const [row] = await sql<Row[]>`
    INSERT INTO updates (title, changes, created_by) VALUES (${input.title}, ${sql.json(input.changes)}, ${actor.id})
    RETURNING id, title, changes, published_at, updated_at, discord_message_id`
  return toUpdate(row!)
}

// Saves the title and changes; a posted update's Discord message is edited to match.
export async function saveUpdate(id: number, input: { title: string; changes: UpdateChange[] }, origin: string) {
  const sql = await db()
  const [row] = await sql<Row[]>`
    UPDATE updates SET title = ${input.title}, changes = ${sql.json(input.changes)}, updated_at = now() WHERE id = ${id}
    RETURNING id, title, changes, published_at, updated_at, discord_message_id`
  if (!row) throw notFound()
  const discord: DiscordOutcome = row.discord_message_id ? await discordEdit(row, origin) : 'unchanged'
  return { update: toUpdate(row), discord }
}

// Publishes a draft (once), and posts it to Discord if asked and a webhook is set.
export async function publishUpdate(id: number, toDiscord: boolean, origin: string) {
  const before = await getRow(id)
  if (before.published_at) throw createError({ statusCode: 409, statusMessage: 'This update is already published' })
  if (!before.changes.length) throw bad('Add at least one change before publishing')
  const sql = await db()
  let [row] = await sql<Row[]>`
    UPDATE updates SET published_at = now(), updated_at = now() WHERE id = ${id}
    RETURNING id, title, changes, published_at, updated_at, discord_message_id`
  let discord: DiscordOutcome = 'unchanged'
  if (toDiscord) {
    const posted = await discordPost(row!, origin)
    discord = posted.outcome
    if (posted.messageId) {
      ;[row] = await sql<Row[]>`
        UPDATE updates SET discord_message_id = ${posted.messageId} WHERE id = ${id}
        RETURNING id, title, changes, published_at, updated_at, discord_message_id`
    }
  }
  return { update: toUpdate(row!), discord }
}

// Deletes an update, and its Discord message if it has one.
export async function deleteUpdate(id: number) {
  const row = await getRow(id)
  const discord: DiscordOutcome = row.discord_message_id ? await discordDelete(row.discord_message_id) : 'unchanged'
  const sql = await db()
  await sql`DELETE FROM updates WHERE id = ${id}`
  return { update: toUpdate(row), discord }
}

// ---- Discord: one message per published update, through the channel webhook ----

const webhook = () => (useRuntimeConfig().discord.updatesWebhook as string) || ''

async function discordMessage(row: Row, origin: string) {
  const site = await loadSite()
  return {
    allowed_mentions: { parse: [] }, // never ping anyone from update text
    embeds: [
      {
        title: `What's new: ${row.title}`,
        url: origin,
        color: Number.parseInt(site.brandColor.slice(1), 16),
        description: row.changes.map((c) => `**${c.area}**\n${c.text}`).join('\n\n'),
        timestamp: row.published_at?.toISOString()
      }
    ]
  }
}

async function discordPost(row: Row, origin: string): Promise<{ outcome: DiscordOutcome; messageId?: string }> {
  if (!webhook()) return { outcome: 'off' }
  try {
    const message = await $fetch<{ id: string }>(`${webhook()}?wait=true`, { method: 'POST', body: await discordMessage(row, origin) })
    return { outcome: 'posted', messageId: message.id }
  } catch (err) {
    console.error('Discord post for an update failed', err)
    return { outcome: 'failed' }
  }
}

async function discordEdit(row: Row, origin: string): Promise<DiscordOutcome> {
  if (!webhook()) return 'off'
  try {
    await $fetch(`${webhook()}/messages/${row.discord_message_id}`, { method: 'PATCH', body: await discordMessage(row, origin) })
    return 'updated'
  } catch (err) {
    console.error('Discord edit for an update failed', err)
    return 'failed'
  }
}

async function discordDelete(messageId: string): Promise<DiscordOutcome> {
  if (!webhook()) return 'off'
  try {
    await $fetch(`${webhook()}/messages/${messageId}`, { method: 'DELETE' })
    return 'removed'
  } catch (err) {
    console.error('Discord delete for an update failed', err)
    return 'failed'
  }
}

export const discordUpdatesEnabled = () => Boolean(webhook())
