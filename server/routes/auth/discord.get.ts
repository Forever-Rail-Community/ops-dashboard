// Discord login. Redirect URL to register in the Discord developer portal: <site>/auth/discord
export default defineOAuthDiscordEventHandler({
  config: { scope: ['identify', 'guilds.members.read'] },

  async onSuccess(event, { user, tokens }) {
    const cfg = useRuntimeConfig(event).discord
    if (!cfg.guildId) {
      throw createError({ statusCode: 500, statusMessage: 'Discord server ID is not configured' })
    }

    let member: { roles?: string[]; nick?: string | null }
    try {
      member = await $fetch(`https://discord.com/api/v10/users/@me/guilds/${cfg.guildId}/member`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      })
    } catch {
      return sendRedirect(event, '/login?error=not-member')
    }

    const access = await resolveAccess(user.id, member.roles ?? [])
    if (!access) return sendRedirect(event, '/login?error=no-role')

    await setUserSession(event, {
      user: {
        id: user.id,
        username: user.username,
        name: member.nick || user.global_name || user.username,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
          : null,
        roles: access.roles,
        permissions: access.permissions
      }
    })
    return sendRedirect(event, '/')
  },

  onError(event) {
    return sendRedirect(event, '/login?error=discord')
  }
})
