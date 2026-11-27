// The always-on half of the Discord bot. Discord only sends typed messages over a live connection, so this process
// stays connected and forwards each message in a ticket thread to the Operations Center, which decides what to keep.
// Everything else (threads, cards, buttons, /ticket) is handled by the Operations Center itself.
import { Client, Events, GatewayIntentBits } from 'discord.js'

const env = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Set ${name} (see bot/README.md)`)
  return value
}
const TOKEN = env('DISCORD_BOT_TOKEN')
const DASHBOARD = env('DASHBOARD_URL').replace(/\/$/, '')
const SECRET = env('BOT_SECRET')
const TICKETS_CHANNEL = env('TICKETS_CHANNEL_ID')

async function dashboard(method, path, body) {
  const res = await fetch(`${DASHBOARD}${path}`, {
    method,
    headers: { authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' },
    body: body && JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`)
  return res.json()
}

const inTicketThread = (message) => message.channel.isThread() && message.channel.parentId === TICKETS_CHANNEL
// Skips the bot's own posts (the card and mirrored replies), webhooks and Discord's system notices.
const typedByPerson = (message) => !message.author.bot && !message.webhookId && !message.system

async function forward(message) {
  const member = message.member ?? (await message.guild?.members.fetch(message.author.id).catch(() => null))
  const { result } = await dashboard('POST', '/api/discord/messages', {
    threadId: message.channelId,
    messageId: message.id,
    author: {
      id: message.author.id,
      username: message.author.username,
      globalName: message.author.globalName,
      nick: member?.nickname ?? null
    },
    roles: member ? [...member.roles.cache.keys()].filter((id) => id !== message.guildId) : [],
    content: message.content,
    attachments: [...message.attachments.values()].map((a) => ({ name: a.name }))
  })
  return result
}

async function forwardSafely(message) {
  try {
    await forward(message)
  } catch (err) {
    console.error(`Could not forward message ${message.id}:`, err.message)
  }
}

// Messages sent while the bot was offline: for each recent ticket thread, everything after the last one saved.
async function catchUp(client) {
  const threads = await dashboard('GET', '/api/discord/threads')
  let forwarded = 0
  for (const { threadId, after } of threads) {
    const thread = await client.channels.fetch(threadId).catch(() => null)
    if (!thread?.isThread()) continue
    let cursor = after
    for (;;) {
      const batch = await thread.messages.fetch({ after: cursor, limit: 100 }).catch(() => null)
      if (!batch?.size) break
      const oldestFirst = [...batch.values()].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1))
      for (const message of oldestFirst.filter(typedByPerson)) {
        await forwardSafely(message)
        forwarded++
      }
      cursor = oldestFirst.at(-1).id
      if (batch.size < 100) break
    }
  }
  console.log(`Caught up on ${threads.length} ticket threads (${forwarded} messages checked).`)
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
})

client.once(Events.ClientReady, async (c) => {
  console.log(`Signed in as ${c.user.tag}.`)
  await catchUp(c).catch((err) => console.error('Catching up failed:', err.message))
})

client.on(Events.MessageCreate, (message) => {
  if (inTicketThread(message) && typedByPerson(message)) forwardSafely(message)
})

client.login(TOKEN)
