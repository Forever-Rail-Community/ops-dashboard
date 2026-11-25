<script setup lang="ts">
// The CTC board's commands: a box to type one, and the latest with what the game said. Each shows SENT until the game
// answers, then CONFIRMED or REJECTED with the reason. Sent from the board's clicks too (see `send`).
import { toast } from 'vue-sonner'

const URL = '/api/railroader/ctc/commands'
const STATUS: Record<ServerCommandState, { label: string; class: string }> = {
  queued: { label: 'SENT', class: 'text-neutral-300' },
  sent: { label: 'SENT', class: 'text-neutral-300' },
  pending: { label: 'SENT', class: 'text-neutral-300' },
  ok: { label: 'CONFIRMED', class: 'text-emerald-400' },
  refused: { label: 'REJECTED', class: 'text-red-400' },
  error: { label: 'REJECTED', class: 'text-red-400' },
  expired: { label: 'REJECTED', class: 'text-red-400' }
}
// Answers that only repeat the status aren't shown beside it.
const SAID_BY_STATUS = ['Sent.', 'Cleared.', 'Stopped.', 'Lined normal.', 'Lined reverse.', '']

const { commands, add } = await useCommandList(URL, 'ctc-commands')
const typed = ref('')

async function send(action: CtcAction) {
  try {
    add(await $fetch<ServerCommand>(URL, { method: 'POST', body: action }))
  } catch (err) {
    toast.error('Not sent', { description: errorText(err) })
  }
}

async function sendTyped() {
  const action = parseTypedCtc(typed.value)
  if (!action) {
    toast.error('Not a board command', { description: 'Type CLR <signal> [N|R], STOP <control point> or SW <control point> N|R.' })
    return
  }
  typed.value = ''
  await send(action)
}

defineExpose({ send })
</script>

<template>
  <section class="rounded-xl border bg-black px-5 py-4 text-neutral-200" aria-labelledby="ctc-commands">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 id="ctc-commands" class="text-sm font-semibold uppercase">Commands</h2>
      <form class="flex min-w-72 flex-1 justify-end gap-2" autocomplete="off" @submit.prevent="sendTyped">
        <Input v-model="typed" class="max-w-sm border-neutral-700 bg-neutral-950 font-mono uppercase" placeholder="CLR wh-ws R" aria-label="Type a board command" maxlength="80" />
        <Button type="submit" variant="secondary" :disabled="!typed.trim()">Send</Button>
      </form>
    </div>
    <p class="mt-1 text-xs text-neutral-500">CLR signal [N|R] clears it, lining the switch normal or reverse. STOP control point. SW control point N|R. Ids show when you hover the board.</p>
    <ol class="mt-3 divide-y divide-neutral-800 font-mono text-sm">
      <li v-for="c in commands" :key="c.id" class="flex flex-wrap items-baseline gap-x-4 py-1.5">
        <span class="w-24 text-neutral-500 tabular-nums">{{ commandTime(c.at) }}</span>
        <span class="w-40">{{ ctcCommandLabel(c.text) }}</span>
        <span class="w-24" :class="STATUS[c.state].class">{{ STATUS[c.state].label }}</span>
        <span v-if="!SAID_BY_STATUS.includes(c.message)" class="text-neutral-400">{{ c.message }}</span>
        <span class="ml-auto font-sans text-xs text-neutral-500">{{ c.by }}</span>
      </li>
      <li v-if="!commands.length" class="py-1.5 font-sans text-neutral-500">No commands yet. Click a signal or a switch on the board, or type one.</li>
    </ol>
  </section>
</template>
