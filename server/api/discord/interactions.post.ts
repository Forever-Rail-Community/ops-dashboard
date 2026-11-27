import { waitUntil } from '@vercel/functions'

// Discord's Interactions Endpoint: /ticket, /ticket-panel, the panel's buttons, the new-ticket form and the
// "Mark as solved" button on a ticket's card. Discord signs every request; anything unsigned is refused.
// Answers must reach Discord within 3 seconds, so opening a ticket answers "working on it" first and finishes after.

const InteractionType = { Ping: 1, Command: 2, Component: 3, ModalSubmit: 5 } as const
const Reply = { Pong: 1, Message: 4, Deferred: 5, UpdateMessage: 7, Modal: 9 } as const
const EPHEMERAL = 64

const privately = (content: string) => ({ type: Reply.Message, data: { content, flags: EPHEMERAL, allowed_mentions: { parse: [] } } })
const isKind = (v: unknown): v is TicketKind => TICKET_KINDS.some((k) => k.value === v)
const isGame = (v: unknown): v is TicketGame => TICKET_GAMES.some((g) => g.value === v)

export default defineEventHandler(async (event) => {
  const { publicKey, applicationId } = discordBotConfig()
  const raw = (await readRawBody(event, 'utf8')) ?? ''
  const signed = verifyDiscordSignature(publicKey, getRequestHeader(event, 'x-signature-ed25519') ?? '', getRequestHeader(event, 'x-signature-timestamp') ?? '', raw)
  if (!signed) throw createError({ statusCode: 401, statusMessage: 'Invalid request signature' })

  const interaction = JSON.parse(raw)
  if (interaction.type === InteractionType.Ping) return { type: Reply.Pong }

  const discordUser = interaction.member?.user ?? interaction.user
  const actor = { id: String(discordUser?.id ?? ''), name: discordMemberName(interaction.member, interaction.user) }
  const roles: string[] = interaction.member?.roles ?? []
  const origin = getRequestURL(event).origin

  if (interaction.type === InteractionType.Command && interaction.data?.name === 'ticket') {
    const option = (name: string) => interaction.data.options?.find((o: { name: string }) => o.name === name)?.value
    const kind = isKind(option('type')) ? option('type') : 'support'
    const game = isGame(option('game')) ? option('game') : 'none'
    return { type: Reply.Modal, data: newTicketModal(kind, game) }
  }

  if (interaction.type === InteractionType.Command && interaction.data?.name === 'ticket-panel') {
    return { type: Reply.Message, data: ticketPanel(await brandColor()) }
  }

  const customId: string = interaction.data?.custom_id ?? ''

  if (interaction.type === InteractionType.Component && customId.startsWith('ticket:open:')) {
    const [, , kind, game] = customId.split(':')
    if (!isKind(kind) || !isGame(game)) return privately('That button is out of date. Ask staff to post the panel again.')
    return { type: Reply.Modal, data: newTicketModal(kind, game) }
  }

  if (interaction.type === InteractionType.ModalSubmit && customId.startsWith('ticket:new:')) {
    const [, , kind, game] = customId.split(':')
    const field = (id: string) => interaction.data.components
      ?.flatMap((row: { components: { custom_id: string; value: string }[] }) => row.components)
      .find((c: { custom_id: string }) => c.custom_id === id)?.value
    let input: ReturnType<typeof parseNewTicket>
    try {
      input = parseNewTicket({ kind, game, subject: field('subject'), body: field('body') }, undefined)
    } catch (err: any) {
      return privately(err?.statusMessage ?? 'That ticket could not be opened.')
    }
    // Answer now, open the ticket and its thread after, then fill in the answer.
    const followUp = (content: string) => discordApi('PATCH', `/webhooks/${applicationId}/${interaction.token}/messages/@original`, { content, allowed_mentions: { parse: [] } })
    waitUntil((async () => {
      try {
        const ticket = await createTicket(input, actor, origin, { via: 'Discord' })
        await syncTicketThreadSafely(ticket.id, origin)
        const [row] = await (await db())<{ thread: string | null }[]>`SELECT discord_thread_id AS thread FROM tickets WHERE id = ${ticket.id}`
        const where = row?.thread && row.thread !== 'pending' ? `<#${row.thread}>` : `the Operations Center (${origin}/tickets?ticket=${ticket.id})`
        await followUp(`Ticket ${ticketRef(ticket.id)} is open. Staff will reply in ${where}.`)
      } catch (err: any) {
        await followUp(err?.statusMessage ?? 'That ticket could not be opened. Try again, or use the Operations Center.').catch(() => {})
      }
    })())
    return { type: Reply.Deferred, data: { flags: EPHEMERAL } }
  }

  if (interaction.type === InteractionType.Component && customId.startsWith('ticket:solve:')) {
    const id = Number(customId.split(':')[2])
    try {
      const staff = await discordMemberIsTicketStaff(actor.id, roles)
      const { ticket } = await updateTicket(parseTicketId(id), { status: 'solved' }, actor, staff, { via: 'Discord' })
      waitUntil(syncTicketThreadSafely(id, origin))
      return { type: Reply.UpdateMessage, data: ticketCard({ ...ticket, assignee_name: ticket.assignee?.name ?? null }, origin, await brandColor()) }
    } catch (err: any) {
      if (err?.statusCode === 403 || err?.statusCode === 404) return privately('Only the person who opened this ticket, or staff, can mark it as solved.')
      throw err
    }
  }

  return privately('That isn’t something this bot knows how to do yet.')
})
