// The bot's slash commands, registered for the server from Admin > Discord (POST /api/admin/discord/commands).
// /ticket opens a ticket; /ticket-panel posts the "Open a ticket" buttons (for people who can manage the server).
const MANAGE_GUILD = String(1 << 5)

export const DISCORD_COMMANDS = [
  {
    name: 'ticket',
    description: 'Open a private support ticket with staff',
    contexts: [0],
    options: [
      {
        type: 3, name: 'type', description: 'What the ticket is about', required: false,
        choices: TICKET_KINDS.map((k) => ({ name: k.label, value: k.value }))
      },
      {
        type: 3, name: 'game', description: 'Which game it is about', required: false,
        choices: TICKET_GAMES.map((g) => ({ name: g.label, value: g.value }))
      }
    ]
  },
  {
    name: 'ticket-panel',
    description: 'Post the "Open a ticket" buttons in this channel',
    contexts: [0],
    default_member_permissions: MANAGE_GUILD
  }
]

// The form Discord shows for a new ticket. Type and game travel in the custom ID.
export function newTicketModal(kind: TicketKind, game: TicketGame) {
  const title = kind === 'member_report' ? 'Report a member' : `New ticket${game === 'none' ? '' : ` · ${TICKET_GAMES.find((g) => g.value === game)!.label}`}`
  return {
    custom_id: `ticket:new:${kind}:${game}`,
    title,
    components: [
      { type: 1, components: [{ type: 4, custom_id: 'subject', label: 'Subject', style: 1, max_length: TICKET_LIMITS.subject, required: true, placeholder: 'Example: Can’t connect to the SE route' }] },
      { type: 1, components: [{ type: 4, custom_id: 'body', label: 'Details', style: 2, max_length: TICKET_LIMITS.body, required: true, placeholder: 'Include what happened, what you expected, and any steps you already tried.' }] }
    ]
  }
}

// The panel /ticket-panel posts: one button per kind of ticket, so the game is known without asking.
export const ticketPanel = (color: number) => ({
  embeds: [{
    title: 'Need help from staff?',
    description: 'Open a private ticket. Only you and staff can see it, and you can follow it here or in the Operations Center.',
    color
  }],
  components: [{
    type: 1,
    components: [
      { type: 2, style: 1, label: 'Run8', custom_id: 'ticket:open:support:run8' },
      { type: 2, style: 1, label: 'Railroader', custom_id: 'ticket:open:support:railroader' },
      { type: 2, style: 2, label: 'Something else', custom_id: 'ticket:open:support:none' },
      { type: 2, style: 2, label: 'Report a member', custom_id: 'ticket:open:member_report:none' }
    ]
  }]
})
