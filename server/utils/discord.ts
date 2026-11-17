// Posting to Discord channels through webhooks. Two optional channels, each a webhook URL in Vercel:
//   announcements (NUXT_DISCORD_UPDATES_WEBHOOK): What's new updates and roadmap status changes;
//   staff (NUXT_DISCORD_STAFF_WEBHOOK): new feature requests and bug reports.
// Messages never ping anyone. Discord failing never stops what triggered it: callers get an outcome to report.

export type DiscordChannel = 'announcements' | 'staff'

export interface DiscordEmbed {
  title: string
  url?: string
  description?: string
  color?: number
  timestamp?: string
  footer?: { text: string }
}

function webhook(channel: DiscordChannel): string {
  const discord = useRuntimeConfig().discord
  return ((channel === 'announcements' ? discord.updatesWebhook : discord.staffWebhook) as string) || ''
}

export const discordEnabled = (channel: DiscordChannel) => Boolean(webhook(channel))

// The dashboard's brand color, for the bar beside each message.
export async function brandColor() {
  return Number.parseInt((await loadSite()).brandColor.slice(1), 16)
}

const message = (embed: DiscordEmbed) => ({ allowed_mentions: { parse: [] }, embeds: [embed] })

// Posts a message; returns its id so it can be edited or deleted later.
export async function discordPost(channel: DiscordChannel, embed: DiscordEmbed): Promise<{ outcome: DiscordOutcome; messageId?: string }> {
  const url = webhook(channel)
  if (!url) return { outcome: 'off' }
  try {
    const sent = await $fetch<{ id: string }>(`${url}?wait=true`, { method: 'POST', body: message(embed) })
    return { outcome: 'posted', messageId: sent.id }
  } catch (err) {
    console.error(`Discord post to ${channel} failed`, err)
    return { outcome: 'failed' }
  }
}

export async function discordEdit(channel: DiscordChannel, messageId: string, embed: DiscordEmbed): Promise<DiscordOutcome> {
  const url = webhook(channel)
  if (!url) return 'off'
  try {
    await $fetch(`${url}/messages/${messageId}`, { method: 'PATCH', body: message(embed) })
    return 'updated'
  } catch (err) {
    console.error(`Discord edit in ${channel} failed`, err)
    return 'failed'
  }
}

export async function discordDelete(channel: DiscordChannel, messageId: string): Promise<DiscordOutcome> {
  const url = webhook(channel)
  if (!url) return 'off'
  try {
    await $fetch(`${url}/messages/${messageId}`, { method: 'DELETE' })
    return 'removed'
  } catch (err) {
    console.error(`Discord delete in ${channel} failed`, err)
    return 'failed'
  }
}
