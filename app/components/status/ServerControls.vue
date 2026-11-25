<script setup lang="ts">
// Starting, saving and shutting down a Railroader server, and any other command its agent takes, with the latest
// commands and their answers. Only for staff with "server.control"; the server's agent carries the commands out
// (server/utils/serverCommands.ts). The list refreshes every few seconds while a command is unanswered.
import { useTimeoutPoll } from '@vueuse/core'
import { toast } from 'vue-sonner'

const props = defineProps<{ agent: RailroaderAgent }>()

const FAST_MS = 3_000
const SLOW_MS = 15_000
const COMMANDS = ['start', 'status', 'save', 'autosave', 'window show', 'window hide', 'shutdown', 'shutdown now', 'help']
const STATE: Record<ServerCommandState, { label: string; class: string }> = {
  queued: { label: 'Waiting for the server', class: 'border-border bg-muted text-muted-foreground' },
  sent: { label: 'Sent', class: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  pending: { label: 'Running', class: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  ok: { label: 'Done', class: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  refused: { label: 'Refused', class: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300' },
  error: { label: 'Failed', class: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300' },
  expired: { label: 'Not picked up', class: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300' }
}
const UNFINISHED: ServerCommandState[] = ['queued', 'sent', 'pending']

const url = computed(() => `/api/servers/${props.agent.agentId}/commands`)
const { data: commands, refresh } = await useFetch<ServerCommand[]>(url, { key: `commands-${props.agent.agentId}`, default: () => [] })
const waiting = computed(() => commands.value.some((c) => UNFINISHED.includes(c.state)))
const { resume } = useTimeoutPoll(refresh, () => (waiting.value ? FAST_MS : SLOW_MS), { immediate: true })

const running = computed(() => props.agent.railroader.process.status === 'online')
const open = computed(() => running.value && props.agent.railroader.api?.sessionState === 'active')
const players = computed(() => props.agent.railroader.players ?? null)
const why = computed(() =>
  props.agent.stale ? "The server's agent isn't reporting, so nothing would carry these out."
  : !running.value ? 'The game is closed.'
  : props.agent.railroader.api?.reachable && !open.value ? 'Save and Shut down come back once the railroad is open.'
  : '')

const text = ref('')
const busy = ref(false)
const confirming = ref(false)

async function send(command: string) {
  busy.value = true
  try {
    const sent = await $fetch<ServerCommand>(url.value, { method: 'POST', body: { text: command } })
    commands.value = [sent, ...commands.value]
    resume()
  } catch (err) {
    toast.error('Not sent', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}

async function sendTyped() {
  const command = text.value.trim()
  if (!command) return
  text.value = ''
  await send(command)
}

async function shutDown(save: boolean) {
  confirming.value = false
  await send(save ? 'shutdown' : 'shutdown now')
}

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
</script>

<template>
  <div class="grid gap-5 border-t pt-5 pb-1">
    <div>
      <h3 class="text-sm font-semibold">Controls</h3>
      <p class="text-sm text-muted-foreground">Carried out by the agent on the server, usually within 5 seconds.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2.5">
      <Button :disabled="busy || agent.stale || running" @click="send('start')">Start the game</Button>
      <Button variant="secondary" :disabled="busy || agent.stale || !open" @click="send('save')">Save</Button>
      <Button variant="destructive" :disabled="busy || agent.stale || !open" @click="confirming = true">Shut down…</Button>
      <span v-if="why" class="text-sm text-muted-foreground">{{ why }}</span>
    </div>

    <div>
      <form class="flex gap-2.5" autocomplete="off" @submit.prevent="sendTyped">
        <Input v-model="text" placeholder="Type a command, e.g. status" aria-label="Command for the server" maxlength="200" :disabled="agent.stale" />
        <Button type="submit" variant="secondary" :disabled="busy || agent.stale || !text.trim()">Send</Button>
      </form>
      <p class="mt-1.5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        Commands:
        <code v-for="c in COMMANDS" :key="c" class="rounded bg-muted px-1.5 py-px font-mono text-xs text-foreground">{{ c }}</code>
      </p>
    </div>

    <div>
      <h3 class="mb-2 text-sm font-semibold">Recent commands</h3>
      <Table>
        <TableHeader>
          <TableRow><TableHead class="w-28">Time</TableHead><TableHead class="w-32">By</TableHead><TableHead>Command</TableHead><TableHead>Result</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="c in commands" :key="c.id" class="align-top">
            <TableCell class="whitespace-nowrap text-muted-foreground tabular-nums">{{ time(c.at) }}</TableCell>
            <TableCell class="whitespace-nowrap">{{ c.by }}</TableCell>
            <TableCell><code class="font-mono">{{ c.text }}</code></TableCell>
            <TableCell class="whitespace-normal">
              <Badge variant="outline" :class="STATE[c.state].class">{{ STATE[c.state].label }}</Badge>
              <p v-if="c.message" class="mt-1">{{ c.message }}</p>
            </TableCell>
          </TableRow>
          <TableRow v-if="!commands.length">
            <TableCell colspan="4" class="text-muted-foreground">No commands yet. The latest 20 are kept here, with who sent them.</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog v-model:open="confirming">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shut down the game?</DialogTitle>
          <DialogDescription>
            It saves the railroad first and closes the game once the save is written. If the save can't be made, the
            game keeps running and you'll see why.
          </DialogDescription>
        </DialogHeader>
        <p v-if="players?.length" class="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {{ players.length === 1 ? '1 player is' : `${players.length} players are` }} on the railroad: {{ players.join(', ') }}.
          They'll be disconnected.
        </p>
        <DialogFooter class="items-center sm:justify-between">
          <Button variant="link" class="px-0 text-muted-foreground" @click="shutDown(false)">Close without saving</Button>
          <div class="flex gap-2">
            <Button variant="outline" @click="confirming = false">Cancel</Button>
            <Button variant="destructive" @click="shutDown(true)">Save and shut down</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
