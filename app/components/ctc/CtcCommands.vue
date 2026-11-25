<script setup lang="ts">
// The console's COMMANDS column, as board E shows it: the latest commands with what the game said (SENT until it
// answers, then CONFIRMED or REJECTED with the reason), and the command line under them. Clicks on the board send
// through `send` too.
import { toast } from 'vue-sonner'

const URL = '/api/railroader/ctc/commands'
const STATUS: Record<ServerCommandState, { label: string; class: string }> = {
  queued: { label: 'SENT', class: 'text-neutral-300' },
  sent: { label: 'SENT', class: 'text-neutral-300' },
  pending: { label: 'SENT', class: 'text-neutral-300' },
  ok: { label: 'CONFIRMED', class: 'text-green-400' },
  refused: { label: 'REJECTED', class: 'text-red-400' },
  error: { label: 'REJECTED', class: 'text-red-400' },
  expired: { label: 'REJECTED', class: 'text-red-400' }
}
// Only a reason is worth showing beside the status; answers that repeat it aren't.
const reason = (c: ServerCommand) => (['refused', 'error', 'expired'].includes(c.state) ? c.message.replace(/^Rejected:?\s*/, '').replace(/\.$/, '') : '')

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
  <section aria-labelledby="ctc-commands" class="flex min-w-0 flex-[2_1_460px] flex-col border-r border-[#2a2a2a]">
    <h2 id="ctc-commands" class="border-b border-[#1f1f1f] px-3 py-1.5 text-sm font-bold text-neutral-400">COMMANDS</h2>
    <ol class="flex-1 py-1 text-[15px]">
      <li v-for="c in commands.slice(0, 8)" :key="c.id" class="grid grid-cols-[76px_1fr_104px] gap-2 px-3 py-[3px]">
        <span class="text-neutral-400">{{ commandTime(c.at) }}</span>
        <span class="flex flex-wrap gap-x-2.5 text-neutral-50">
          {{ ctcCommandLabel(c.text).toUpperCase() }}<span v-if="reason(c)" class="text-red-300">{{ reason(c).toUpperCase() }}</span><span class="text-neutral-500">{{ c.by.toUpperCase() }}</span>
        </span>
        <span class="text-right font-bold" :class="STATUS[c.state].class">{{ STATUS[c.state].label }}</span>
      </li>
      <li v-if="!commands.length" class="px-3 py-[3px] text-neutral-500">NO COMMANDS YET. CLICK A SIGNAL OR A SWITCH, OR TYPE ONE BELOW.</li>
    </ol>
    <form class="flex items-center gap-2 border-t border-[#2a2a2a] bg-[#0a0a0a] px-3 py-1.5" autocomplete="off" @submit.prevent="sendTyped">
      <label for="ctc-cmd" class="font-bold text-sky-400">CMD</label>
      <input
        id="ctc-cmd" v-model="typed" maxlength="80" placeholder="CLR WH-WS R   STOP WH-W   SW WH-W N"
        class="h-[30px] flex-1 border border-neutral-700 bg-black px-2 text-[15px] font-medium tracking-[.04em] text-neutral-50 uppercase placeholder:text-neutral-600"
      >
    </form>
  </section>
</template>
