// Public on purpose: the help site's "Join Discord" button shows how many members are online. Read from Discord's
// server widget, which must be turned on (Server Settings > Widget > Enable Server Widget). Any site may read it.
interface DiscordWidget {
  presence_count: number
}

export default defineEventHandler(async (event): Promise<{ online: number }> => {
  setHeader(event, 'Access-Control-Allow-Origin', '*')
  const { guildId } = useRuntimeConfig(event).discord
  if (!guildId) throw createError({ statusCode: 404, statusMessage: 'No Discord server is set (NUXT_DISCORD_GUILD_ID)' })

  let widget: DiscordWidget
  try {
    widget = await $fetch<DiscordWidget>(`https://discord.com/api/guilds/${encodeURIComponent(guildId)}/widget.json`)
  } catch (err: any) {
    // Discord answers 403 when the server widget is turned off.
    const off = err?.response?.status === 403
    throw createError({
      statusCode: off ? 404 : 502,
      statusMessage: off ? "The Discord server's widget is turned off" : 'Could not reach Discord'
    })
  }
  // Cached for everyone for a few minutes: the count doesn't need to be exact, and Discord limits how often it's asked.
  setHeader(event, 'Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  return { online: widget.presence_count }
})
