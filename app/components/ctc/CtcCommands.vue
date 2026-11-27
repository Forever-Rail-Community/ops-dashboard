<script setup lang="ts">
// The console's COMMANDS column, as board E shows it: the latest commands with what the game said (SENT until it
// answers, then CONFIRMED or REJECTED with the reason), and the command line under them. Clicks on the board send
// through `send` too. A command that isn't sent says why in a line above the command line, in the board's own style.
// `check` can stop one before it's sent, with the reason (a signal whose switch isn't lined for it yet).
import { useTimeoutFn } from '@vueuse/core'

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

const props = defineProps<{ check?: (action: CtcAction) => string | null }>()

const { commands, add } = await useCommandList(URL, 'ctc-commands')
const typed = ref('')

const NOTICE_MS = 10_000
const notice = ref<{ title: string; text: string } | null>(null)
const { start: clearLater } = useTimeoutFn(() => (notice.value = null), NOTICE_MS, { immediate: false })
function tell(title: string, text: string) {
  notice.value = { title, text }
  clearLater()
}

async function send(action: CtcAction) {
  notice.value = null
  const blocked = props.check?.(action)
  if (blocked) return tell('NOT SENT', blocked)
  try {
    add(await $fetch<ServerCommand>(URL, { method: 'POST', body: action }))
  } catch (err) {
    tell('NOT SENT', errorText(err))
  }
}

async function sendTyped() {
  const action = parseTypedCtc(typed.value)
  if (!action) {
    tell('NOT A BOARD COMMAND', 'Type SW <control point> N|R, CLR <signal>, or STOP <control point>.')
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
    <p v-if="notice" role="alert" class="flex items-center gap-2 border-t border-[#7f1d1d] bg-[#1c0a0a] px-3 py-1.5 text-[15px]">
      <span class="font-bold text-red-400">&#9888; {{ notice.title }}</span>
      <span class="text-neutral-200">{{ notice.text }}</span>
      <button type="button" class="ml-auto px-1 text-sm font-semibold text-neutral-400" aria-label="Dismiss" @click="notice = null">X</button>
    </p>
    <form class="flex items-center gap-2 border-t border-[#2a2a2a] bg-[#0a0a0a] px-3 py-1.5" autocomplete="off" @submit.prevent="sendTyped">
      <label for="ctc-cmd" class="font-bold text-sky-400">CMD</label>
      <input
        id="ctc-cmd" v-model="typed" maxlength="80" placeholder="SW WH-W R   CLR WH-WS   STOP WH-W"
        class="h-[30px] flex-1 border border-neutral-700 bg-black px-2 text-[15px] font-medium tracking-[.04em] text-neutral-50 uppercase placeholder:text-neutral-600"
      >
    </form>
  </section>
</template>
