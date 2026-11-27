<script setup lang="ts">
// The Discord bot behind ticket threads: which settings are in place, the address to give Discord, and registering
// the /ticket commands. The settings themselves are environment variables (see .env.example).
import { Check, Copy, X } from '@lucide/vue'
import { toast } from 'vue-sonner'

type Status = { settings: Record<string, boolean>; threads: boolean; interactionsUrl: string }
const { data } = await useFetch<Status>('/api/admin/discord', { key: 'admin-discord' })

const SETTINGS = [
  { key: 'botToken', env: 'NUXT_DISCORD_BOT_TOKEN', label: 'Bot token', why: 'Ticket threads' },
  { key: 'ticketsChannelId', env: 'NUXT_DISCORD_TICKETS_CHANNEL_ID', label: 'Tickets channel', why: 'Ticket threads' },
  { key: 'publicKey', env: 'NUXT_DISCORD_PUBLIC_KEY', label: 'Public key', why: '/ticket, its form and the buttons' },
  { key: 'applicationId', env: 'NUXT_OAUTH_DISCORD_CLIENT_ID', label: 'Application (client) ID', why: 'Registering commands' },
  { key: 'guildId', env: 'NUXT_DISCORD_GUILD_ID', label: 'Server ID', why: 'Registering commands' },
  { key: 'botSecret', env: 'NUXT_DISCORD_BOT_SECRET', label: 'Bot secret', why: 'Replies typed in threads (the always-on bot)' }
]

const busy = ref(false)
async function register() {
  busy.value = true
  try {
    const { commands } = await $fetch<{ commands: string[] }>('/api/admin/discord/commands', { method: 'POST' })
    toast.success('Commands registered', { description: commands.join(', ') })
  } catch (err: any) {
    toast.error('Not registered', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text)
  toast.success('Copied')
}
</script>

<template>
  <div v-if="data" class="grid gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Discord bot</CardTitle>
        <CardDescription>
          Each ticket gets a private thread in Discord, and replies stay in sync both ways. Members can also open tickets with
          /ticket or the panel’s buttons. Uses your sign-in application’s bot.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6">
        <ul class="grid gap-2 text-sm">
          <li v-for="s in SETTINGS" :key="s.key" class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="grid size-5 place-items-center rounded-full" :class="data.settings[s.key] ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'">
              <Check v-if="data.settings[s.key]" class="size-3.5" /><X v-else class="size-3.5" />
            </span>
            <span class="font-medium">{{ s.label }}</span>
            <code class="text-xs text-muted-foreground">{{ s.env }}</code>
            <span class="text-xs text-muted-foreground">· {{ s.why }}</span>
          </li>
        </ul>
        <p class="text-sm text-muted-foreground">
          {{ data.threads ? 'Ticket threads are on.' : 'Ticket threads are off until the bot token and tickets channel are set. Tickets still work in the Operations Center.' }}
          Settings are environment variables in Vercel; redeploy after changing them.
        </p>

        <div class="grid gap-2">
          <Label for="interactions-url">Interactions endpoint URL</Label>
          <div class="flex gap-2">
            <Input id="interactions-url" :model-value="data.interactionsUrl" readonly class="font-mono text-xs" />
            <Button variant="outline" size="icon" aria-label="Copy the address" @click="copy(data.interactionsUrl)"><Copy /></Button>
          </div>
          <p class="text-xs text-muted-foreground">Paste this in the Discord Developer Portal, under your application’s General Information.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button :disabled="busy" @click="register">Register commands</Button>
          <span class="text-xs text-muted-foreground">Adds /ticket and /ticket-panel to your server. Run /ticket-panel in your support channel to post the buttons.</span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
