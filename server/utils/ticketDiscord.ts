import { waitUntil } from '@vercel/functions'

// Discord threads for tickets. Each ticket gets a private thread in the tickets channel, with the submitter and the
// assigned staff member in it and a status card at the top. The dashboard stays the source of truth: after any
// change, syncTicketThread() brings the thread up to date. It's safe to run any number of times, and at once:
// each step claims its work in the database before calling Discord, and gives it back if Discord fails.
//   - no thread yet: create it, add the submitter, post the card
//   - post every timeline entry not in Discord yet (never internal notes, never what came from Discord)
//   - keep the card, the assignee's membership and the archived state current

const PENDING = 'pending'
// Message events share these; mentions are turned off so a reply can't ping @everyone or a role.
const NO_PINGS = { parse: [] as string[] }

type ThreadRow = {
  id: number
  kind: TicketKind
  game: TicketGame
  subject: string
  status: TicketStatus
  submitter_id: string
  assignee_id: string | null
  assignee_name: string | null
  discord_thread_id: string | null
  discord_card_id: string | null
  discord_assignee_id: string | null
  discord_archived: boolean
}

type PostRow = { id: string; type: TicketEventType; author_name: string; staff: boolean; body: string; data: { status?: TicketStatus; assignee?: { name: string } | null } }

const threadName = (t: { id: number; subject: string }) => `${ticketRef(t.id)} · ${t.subject}`.slice(0, 100)

// The card at the top of the thread. Discord is where the submitter reads it, so statuses use their wording.
export function ticketCard(t: Pick<ThreadRow, 'id' | 'kind' | 'game' | 'subject' | 'status' | 'assignee_name'>, origin: string, color: number) {
  const status = TICKET_STATUSES.find((s) => s.value === t.status)!.submitterLabel
  return {
    embeds: [{
      title: `Ticket ${ticketRef(t.id)}`,
      description: t.subject,
      color,
      fields: [
        { name: 'Status', value: status, inline: true },
        { name: 'Type', value: `${TICKET_KINDS.find((k) => k.value === t.kind)!.label} · ${TICKET_GAMES.find((g) => g.value === t.game)!.label}`, inline: true },
        { name: 'Assigned to', value: t.assignee_name ?? 'Not yet', inline: true }
      ],
      footer: { text: 'Reply in this thread or in the Operations Center. Both stay in sync.' }
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Mark as solved', custom_id: `ticket:solve:${t.id}`, disabled: t.status === 'solved' },
        { type: 2, style: 5, label: 'Open in Operations Center', url: `${origin}/tickets?ticket=${t.id}` }
      ]
    }]
  }
}

// How one timeline entry reads in the thread, or null when it shouldn't be posted.
function threadLine(e: PostRow): string | null {
  if (e.type === 'message') return `**${e.author_name}**${e.staff ? ' · Staff' : ''}\n${e.body}`
  if (e.type === 'status') {
    // "Waiting on submitter" isn't announced: the card says "Awaiting your reply" instead.
    if (e.data.status === 'waiting') return null
    return `-# ${e.author_name} changed the status to ${TICKET_STATUSES.find((s) => s.value === e.data.status)!.submitterLabel}`
  }
  if (e.type === 'assigned') return e.data.assignee ? `-# Assigned to ${e.data.assignee.name}` : `-# ${e.author_name} removed the assignee`
  return null // 'opened' (the card covers it) and internal notes
}

async function createThread(t: ThreadRow, origin: string, sql: Awaited<ReturnType<typeof db>>) {
  const [claimed] = await sql<{ id: number }[]>`UPDATE tickets SET discord_thread_id = ${PENDING} WHERE id = ${t.id} AND discord_thread_id IS NULL RETURNING id`
  if (!claimed) return false // another run is creating it
  try {
    const { ticketsChannelId } = discordBotConfig()
    const thread = await discordApi<{ id: string }>('POST', `/channels/${ticketsChannelId}/threads`, {
      name: threadName(t), type: 12, invitable: false, auto_archive_duration: 10080
    })
    await discordApi('PUT', `/channels/${thread.id}/thread-members/${t.submitter_id}`)
    const card = await discordApi<{ id: string }>('POST', `/channels/${thread.id}/messages`, {
      content: `<@${t.submitter_id}>, this is your private ticket thread. Only you and staff can see it.`,
      allowed_mentions: { users: [t.submitter_id] },
      ...ticketCard(t, origin, await brandColor())
    })
    await sql`UPDATE tickets SET discord_thread_id = ${thread.id}, discord_card_id = ${card.id} WHERE id = ${t.id}`
    t.discord_thread_id = thread.id
    t.discord_card_id = card.id
    return true
  } catch (err) {
    await sql`UPDATE tickets SET discord_thread_id = NULL WHERE id = ${t.id} AND discord_thread_id = ${PENDING}`
    throw err
  }
}

export async function syncTicketThread(id: number, origin: string): Promise<void> {
  if (!ticketThreadsEnabled()) return
  const sql = await db()
  const [t] = await sql<ThreadRow[]>`
    SELECT id, kind, game, subject, status, submitter_id, assignee_id, assignee_name,
      discord_thread_id, discord_card_id, discord_assignee_id, discord_archived
    FROM tickets WHERE id = ${id}`
  if (!t || t.discord_thread_id === PENDING) return
  const created = !t.discord_thread_id && (await createThread(t, origin, sql))
  if (!t.discord_thread_id || t.discord_thread_id === PENDING) return
  const thread = t.discord_thread_id

  // Reopened: bring the thread back before posting into it.
  if (t.discord_archived && t.status !== 'solved') {
    await discordApi('PATCH', `/channels/${thread}`, { archived: false })
    await sql`UPDATE tickets SET discord_archived = false WHERE id = ${id}`
  }

  // Claim what's not in Discord yet, oldest first, then post each.
  const posts = await sql<PostRow[]>`
    UPDATE ticket_events SET discord_message_id = ${PENDING} || ':' || id
    WHERE ticket_id = ${id} AND discord_message_id IS NULL AND type IN ('message', 'status', 'assigned')
    RETURNING id, type, author_name, staff, body, data`
  posts.sort((a, b) => Number(a.id) - Number(b.id))
  for (const [i, e] of posts.entries()) {
    const content = threadLine(e)
    try {
      const sent = content ? await discordApi<{ id: string }>('POST', `/channels/${thread}/messages`, { content: content.slice(0, 2000), allowed_mentions: NO_PINGS }) : null
      // Entries that aren't posted keep a marker of their own, so they aren't picked up again.
      await sql`UPDATE ticket_events SET discord_message_id = ${sent?.id ?? `skipped:${e.id}`} WHERE id = ${e.id}`
    } catch (err) {
      const rest = posts.slice(i).map((p) => p.id)
      await sql`UPDATE ticket_events SET discord_message_id = NULL WHERE id IN ${sql(rest)} AND discord_message_id LIKE ${PENDING + ':%'}`
      throw err
    }
  }

  // The assigned staff member is in the thread; whoever the bot added before is taken out.
  if (t.assignee_id !== t.discord_assignee_id) {
    if (t.discord_assignee_id && t.discord_assignee_id !== t.submitter_id) {
      await discordApi('DELETE', `/channels/${thread}/thread-members/${t.discord_assignee_id}`).catch(() => {})
    }
    if (t.assignee_id) await discordApi('PUT', `/channels/${thread}/thread-members/${t.assignee_id}`)
    await sql`UPDATE tickets SET discord_assignee_id = ${t.assignee_id} WHERE id = ${id}`
  }

  if (!created && t.discord_card_id) {
    await discordApi('PATCH', `/channels/${thread}/messages/${t.discord_card_id}`, ticketCard(t, origin, await brandColor()))
  }

  // Solved: archive it (not locked, so a reply from the submitter reopens the ticket).
  if (t.status === 'solved' && !t.discord_archived) {
    await discordApi('PATCH', `/channels/${thread}`, { archived: true })
    await sql`UPDATE tickets SET discord_archived = true WHERE id = ${id}`
  }
}

// Brings the thread up to date in the background, after the response has gone out (waitUntil keeps a Vercel
// function alive for it; elsewhere the promise simply finishes).
export function syncTicketThreadLater(id: number, origin: string) {
  if (ticketThreadsEnabled()) waitUntil(syncTicketThreadSafely(id, origin))
}

// After a change on the website or in Discord. Discord being down or misconfigured never fails the change itself:
// the next change on the ticket catches the thread up.
export async function syncTicketThreadSafely(id: number, origin: string) {
  try {
    await syncTicketThread(id, origin)
  } catch (err) {
    console.error(`[tickets] Discord thread for ${ticketRef(id)} not updated:`, err instanceof DiscordError ? `${err.message} ${JSON.stringify(err.body)}` : err)
  }
}

// A message someone typed in a ticket thread, forwarded by the always-on bot. Saved once (by its Discord ID) when it's
// from the submitter or from staff; anyone else in the thread is ignored. Attachments are noted by name for now:
// Discord's file links expire, so they aren't kept.
export interface ThreadMessage {
  threadId: string
  messageId: string
  author: { id: string; username: string; globalName?: string | null; nick?: string | null }
  roles: string[]
  content: string
  attachments: { name: string }[]
}

export function parseThreadMessage(body: any): ThreadMessage {
  const id = (v: unknown) => (typeof v === 'string' && /^\d{1,30}$/.test(v) ? v : null)
  const threadId = id(body?.threadId), messageId = id(body?.messageId), authorId = id(body?.author?.id)
  if (!threadId || !messageId || !authorId || typeof body?.author?.username !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Not a thread message' })
  }
  return {
    threadId,
    messageId,
    author: { id: authorId, username: body.author.username, globalName: body.author.globalName ?? null, nick: body.author.nick ?? null },
    roles: Array.isArray(body.roles) ? body.roles.filter((r: unknown) => id(r)) : [],
    content: typeof body.content === 'string' ? body.content : '',
    attachments: Array.isArray(body.attachments) ? body.attachments.filter((a: any) => typeof a?.name === 'string').map((a: any) => ({ name: a.name.slice(0, 100) })) : []
  }
}

export async function saveThreadMessage(m: ThreadMessage, origin: string): Promise<'saved' | 'ignored' | 'duplicate'> {
  const sql = await db()
  const [t] = await sql<{ id: number; submitter_id: string }[]>`SELECT id, submitter_id FROM tickets WHERE discord_thread_id = ${m.threadId}`
  if (!t) return 'ignored'
  const [seen] = await sql`SELECT 1 FROM ticket_events WHERE discord_message_id = ${m.messageId}`
  if (seen) return 'duplicate'

  const submitter = m.author.id === t.submitter_id
  const staff = await discordMemberIsTicketStaff(m.author.id, m.roles)
  if (!submitter && !staff) return 'ignored'

  const files = m.attachments.map((a) => `[Attachment: ${a.name}]`)
  const body = [m.content.trim(), ...files].filter(Boolean).join('\n').slice(0, TICKET_LIMITS.body)
  if (!body) return 'ignored'

  const actor = { id: m.author.id, name: discordMemberName({ nick: m.author.nick, user: { username: m.author.username, global_name: m.author.globalName } }) }
  try {
    await addTicketMessage(t.id, { body, note: false }, actor, staff, { via: 'Discord', discordMessageId: m.messageId })
  } catch (err: any) {
    if (err?.code === '23505') return 'duplicate' // the same message, forwarded twice at once
    throw err
  }
  syncTicketThreadLater(t.id, origin)
  return 'saved'
}

// Where the bot should catch up after being offline: each recent ticket thread, and the newest Discord message the
// dashboard already has from it.
export async function threadsToCatchUp(): Promise<{ threadId: string; after: string }[]> {
  const sql = await db()
  return sql<{ threadId: string; after: string }[]>`
    SELECT t.discord_thread_id AS "threadId",
      COALESCE((SELECT max(e.discord_message_id::numeric)::text FROM ticket_events e
        WHERE e.ticket_id = t.id AND e.discord_message_id ~ '^[0-9]+$'), t.discord_card_id) AS after
    FROM tickets t
    WHERE t.discord_thread_id ~ '^[0-9]+$' AND t.discord_card_id IS NOT NULL AND t.updated_at > now() - interval '30 days'
    ORDER BY t.updated_at DESC
    LIMIT 200`
}
