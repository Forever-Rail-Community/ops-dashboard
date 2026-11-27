// Registers /ticket and /ticket-panel for the Discord server (replacing this bot's commands there).
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.settings')
  const { token, applicationId, guildId } = discordBotConfig()
  if (!token || !applicationId || !guildId) {
    throw createError({ statusCode: 400, statusMessage: 'Set the bot token, the Discord client ID and the server ID first' })
  }
  try {
    const commands = await discordApi<{ name: string }[]>('PUT', `/applications/${applicationId}/guilds/${guildId}/commands`, DISCORD_COMMANDS)
    await logEvent(user, 'discord.commands', { commands: commands.map((c) => c.name) })
    return { commands: commands.map((c) => `/${c.name}`) }
  } catch (err) {
    if (err instanceof DiscordError) {
      throw createError({ statusCode: 502, statusMessage: `Discord refused the commands (${err.status}). Check the bot token and that the bot is in the server.` })
    }
    throw err
  }
})
