<script setup lang="ts">
// The console's COMMANDS column, as board E shows it: the latest commands with what the game said (SENT until it
// answers, then CONFIRMED or REJECTED with the reason), and the command line under them. Each command is a Trace line
// (components/ui/trace): it shimmers while the game hasn't answered, turns red when rejected, and opens on the game's
// full answer. Clicks on the board send
// through `send` too. A command that isn't sent says why in a line above the command line, in the board's own style.
// `check` can stop one before it's sent, with the reason (a signal whose switch isn't lined for it yet).
import { Check, CircleX, LoaderCircle } from '@lucide/vue'
import { useTimeoutFn } from '@vueuse/core'

const URL = '/api/railroader/ctc/commands'
const SENT = { label: 'SENT', line: 'running', icon: LoaderCircle, class: 'text-neutral-300' } as const
const REJECTED = { label: 'REJECTED', line: 'error', icon: CircleX, class: 'text-red-400' } as const
const STATUS: Record<ServerCommandState, { label: string; line?: 'running' | 'error'; icon: typeof Check; class: string }> = {
  queued: SENT,
  sent: SENT,
  pending: SENT,
  ok: { label: 'CONFIRMED', icon: Check, class: 'text-green-400' },
  refused: REJECTED,
  error: REJECTED,
  expired: { ...REJECTED, label: 'EXPIRED' }
}
// Only a reason is worth showing beside the status; answers that repeat it aren't.
const reason = (c: ServerCommand) => (['refused', 'error', 'expired'].includes(c.state) ? c.message.replace(/^Rejected:?\s*/, '').replace(/\.$/, '') : '')
// An opened row: how long the game server and the game took, what went wrong when nothing came back, and the game's
// own answer when it says more than the row does.
const after = (c: ServerCommand, iso: string) => `${((Date.parse(iso) - Date.parse(c.at)) / 1000).toFixed(1)} s`
function detail(c: ServerCommand) {
  const lines: string[] = []
  if (c.sentAt) lines.push(`Picked up by the game server ${after(c, c.sentAt)} after sending.`)
  if (c.state === 'pending' && c.answeredAt) lines.push(`Acknowledged by the game ${after(c, c.answeredAt)} after sending. Waiting for its final answer.`)
  else if (c.answeredAt && c.state !== 'error') lines.push(`Answered by the game ${after(c, c.answeredAt)} after sending.`)
  if (c.state === 'queued') lines.push('Waiting for the game server to pick it up.')
  if (c.state === 'sent') lines.push("Waiting for the game's answer.")
  if (c.state === 'expired') lines.push(`The game server did not pick this up within ${COMMAND_PICKUP_SEC / 60} minutes. Check that the Forever Rail agent and the game are running.`)
  if (c.state === 'error' && !c.answeredAt) lines.push(`The game did not answer within ${COMMAND_ANSWER_SEC} seconds. Check that the host mod is loaded and the game has finished loading the railroad.`)
  return lines
}
const answer = (c: ServerCommand) => {
  const said = c.message.trim()
  return said && c.state !== 'pending' && said.replace(/^Rejected:?\s*/, '').replace(/\.$/, '').toLowerCase() !== reason(c).toLowerCase() ? said : ''
}

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
    tell('NOT A BOARD COMMAND', 'Type SW <control point> N|R, CLR <signal>, STOP <control point>, or LOCK <control point>.')
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
    <Trace v-if="commands.length" class="flex-1 gap-1.5 px-3 py-2">
      <TraceCollapsible v-for="c in commands.slice(0, 8)" :key="c.id">
        <TraceCollapsibleTrigger>
          <TraceLine :status="STATUS[c.state].line" class="text-[15px]">
            <TraceIcon :class="STATUS[c.state].class">
              <component :is="STATUS[c.state].icon" :class="STATUS[c.state].line === 'running' ? 'animate-spin motion-reduce:animate-none' : ''" />
            </TraceIcon>
            <TraceTitle class="font-semibold text-neutral-50">{{ ctcCommandLabel(c.text).toUpperCase() }}</TraceTitle>
            <TraceDescription class="font-bold" :class="STATUS[c.state].class">{{ STATUS[c.state].label }}<template v-if="reason(c)">: {{ reason(c).toUpperCase() }}</template></TraceDescription>
            <TraceDescription class="text-neutral-500">{{ commandTime(c.at) }} {{ c.by.toUpperCase() }}</TraceDescription>
          </TraceLine>
        </TraceCollapsibleTrigger>
        <TraceCollapsibleContent class="border-[#2a2a2a] font-[Barlow] text-sm tracking-normal text-neutral-400">
          <p>Sent by {{ c.by }} at {{ commandTime(c.at) }}, as <code class="text-[13px] text-neutral-200">{{ c.text }}</code>.</p>
          <p v-for="line in detail(c)" :key="line">{{ line }}</p>
          <p v-if="answer(c)">The game's answer: <span class="text-neutral-200">{{ answer(c) }}</span></p>
        </TraceCollapsibleContent>
      </TraceCollapsible>
    </Trace>
    <p v-else class="flex-1 px-3 py-2 text-[15px] text-neutral-500">NO COMMANDS YET. CLICK A SIGNAL OR A SWITCH, OR TYPE ONE BELOW.</p>
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
