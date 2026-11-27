// What Admin > Discord shows: which bot settings are in place, and the address to give Discord.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.settings')
  const c = discordBotConfig()
  return {
    settings: {
      botToken: Boolean(c.token),
      publicKey: Boolean(c.publicKey),
      ticketsChannelId: Boolean(c.ticketsChannelId),
      botSecret: Boolean(c.botSecret),
      applicationId: Boolean(c.applicationId),
      guildId: Boolean(c.guildId)
    },
    threads: ticketThreadsEnabled(),
    interactionsUrl: `${getRequestURL(event).origin}/api/discord/interactions`
  }
})
