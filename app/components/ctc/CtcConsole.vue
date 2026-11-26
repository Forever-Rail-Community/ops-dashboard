<script setup lang="ts">
// The CTC console, as the agreed board designs show it (CTC Board Prototypes canvas, boards E, G, K, L and M): a status
// strip (line, dispatcher, game link, clock, help), the track display (CtcBoard.vue), alerts, a legend, and the
// COMMANDS, EVENTS and TRAIN columns. With desks (shared/types/ctcDesks.ts), the strip shows who's on each, the board
// opens at yours, only your desks' control points can be worked, and the neighbors row shows what's coming in.
// A line with no desks set up is worked as one, by anyone who can control the board.
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import '@fontsource/barlow/400.css'
import '@fontsource/barlow/700.css'
import { useIntervalFn } from '@vueuse/core'

const props = defineProps<{
  line: CtcLine
  lines: CtcLine[]
  layout: RailroaderSignalLayout
  live: LiveMapData
  linkOk: boolean
  dispatcher: string
  userId: string
  controllable: boolean
  desks: CtcDesk[]
  focus?: string // a desk to open at; otherwise the first of yours
}>()
const emit = defineEmits<{ line: [id: string] }>()

const board = computed(() => boardLayout(props.line, props.layout))
const trains = computed(() => boardTrains(board.value, props.layout, props.live.signals.aspects, props.live.trains))
const spans = computed(() => deskSpans(props.line, props.desks.filter((d) => d.lineId === props.line.id)))
const desks = computed(() => boardDesks(props.line, board.value, spans.value, props.userId))
const mine = computed(() => desks.value.filter((d) => d.mine))
const controls = computed(() =>
  !props.controllable ? [] : spans.value.length ? mine.value.flatMap((d) => d.span.controlPoints) : props.layout.controlPoints.map((cp) => cp.id))
const working = computed(() => controls.value.length > 0)
const neighbors = computed(() => incoming(board.value, desks.value, trains.value))
// Alerts, worked out on each refresh; `since` remembers when each train was first seen at its signal.
const since = new Map<string, number>()
// On a desk, only its own alerts; the desks either side have their own dispatchers or the game's panel.
const alerts = computed(() => ctcAlerts(board.value, props.layout, props.live.signals.aspects, props.live.signals.occupied, props.live.trains, since)
  .filter((a) => !mine.value.length || mine.value.some((d) => a.x >= d.x1 && a.x < d.x2)))
const selected = ref<string>()
const train = computed(() => trains.value.find((t) => t.id === selected.value))
const cpNames = computed(() => new Map(props.layout.controlPoints.map((cp) => [cp.id, cp.name])))
const span = computed(() => `${props.line.towns[0]?.name} to ${props.line.towns.at(-1)?.name}`.toUpperCase())
const title = computed(() => `${props.line.name.toUpperCase()}, ${span.value}, ${Math.round(board.value.miles)} MI`)

const boardRef = ref<{ show: (x: number) => void }>()
// Opens at the start of the desk asked for, or your first.
onMounted(() => {
  const desk = desks.value.find((d) => d.id === props.focus) ?? mine.value[0]
  if (desk) nextTick(() => boardRef.value?.show(desk.x1 + 480))
})
const commandsRef = ref<{ send: (action: CtcAction) => Promise<void> }>()

const clock = ref('')
const tick = () => (clock.value = new Date().toLocaleTimeString('en-US', { hour12: false }))
tick()
useIntervalFn(tick, 1000)

// "How this board works" (board L): open on the first visit, and from the ? button after.
const HELP_SEEN = 'ctc-help-seen'
const helpOpen = ref(false)
onMounted(() => {
  try { helpOpen.value = !localStorage.getItem(HELP_SEEN) } catch { helpOpen.value = false }
})
function closeHelp() {
  helpOpen.value = false
  try { localStorage.setItem(HELP_SEEN, '1') } catch { /* private browsing: it shows again next visit */ }
}
</script>

<template>
  <div class="flex flex-col overflow-hidden rounded-xl border border-[#2a2a2a] bg-black font-['Barlow_Condensed'] tracking-[.02em] text-neutral-200 tabular-nums">
    <header class="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 border-b border-[#2a2a2a] bg-[#0d0d0d] px-3.5 py-1.5 text-[15px]">
      <span class="font-bold text-neutral-50">{{ span }}</span>
      <select
        v-if="lines.length > 1" :value="line.id" aria-label="Line"
        class="border border-neutral-700 bg-black px-1.5 py-0.5 text-neutral-400 uppercase" @change="emit('line', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="l in lines" :key="l.id" :value="l.id">RAILROADER, {{ l.name.toUpperCase() }}</option>
      </select>
      <span v-else class="text-neutral-400">RAILROADER, {{ line.name.toUpperCase() }}</span>
      <span v-if="mine.length" class="text-sky-300">{{ mine.map((d) => d.name).join(' + ').toUpperCase() }}</span>
      <span class="ml-auto text-neutral-400">{{ working ? 'DISPATCHER' : 'WATCHING' }} <span class="font-semibold text-neutral-50">{{ dispatcher.toUpperCase() }}</span></span>
      <span class="border px-2" :class="linkOk ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'">GAME LINK {{ linkOk ? 'OK' : 'LOST' }}</span>
      <span class="min-w-[76px] text-right text-xl font-semibold text-neutral-50">{{ clock }}</span>
      <button
        type="button" class="size-6 rounded-full border border-neutral-600 text-[15px] font-bold text-neutral-200" :aria-expanded="helpOpen"
        aria-label="How this board works" title="How this board works" @click="helpOpen ? closeHelp() : (helpOpen = true)"
      >?</button>
    </header>

    <div class="relative">
      <div
        v-if="helpOpen" role="dialog" aria-label="How this board works"
        class="absolute top-2.5 left-3.5 z-20 w-[470px] max-w-[calc(100%-28px)] border border-neutral-600 bg-[#111] font-[Barlow] text-[15px]/[1.45] tracking-normal text-neutral-200 shadow-[0_12px_32px_rgba(0,0,0,.85)]"
      >
        <div class="flex items-center justify-between border-b border-[#2a2a2a] px-3 py-2 font-['Barlow_Condensed'] text-base font-bold tracking-[.03em] text-neutral-50">
          HOW THIS BOARD WORKS<button type="button" class="px-1 text-neutral-400" aria-label="Close" @click="closeHelp">&#10005;</button>
        </div>
        <ul class="grid list-disc gap-[7px] py-2.5 pr-3.5 pl-[30px]">
          <li>The strip at the top is the whole line, and the white box is the part this board shows. Click the strip to move there.</li>
          <li>Track colors: <b class="text-red-400">red</b> has a train on it, <b class="text-green-400">green</b> is a route cleared through a control point, and gray is empty.</li>
          <li v-if="desks.length">The row under the strip shows each desk and who's on it. You can work only the desks you've taken, on the Desks page; the others are dimmed.</li>
          <li v-if="working">Click a signal to clear or stop it, and a switch's <b>N</b> or <b>R</b> to line it. Click a train for its details.</li>
          <li v-else-if="controllable">Click a train for its details. Take a desk on the Desks page to work its signals and switches.</li>
          <li v-else>Click a train for its details. Working the line needs the "Clear signals and throw switches" permission.</li>
          <li v-if="working">Each command shows <b>SENT</b> until the game answers, then <b>CONFIRMED</b> or <b>REJECTED</b> with the reason.</li>
          <li v-if="working">Prefer typing? <b>CLR WH-WS R</b> clears a signal and lines its switch reverse, <b>STOP WH-W</b> stops a control point, and <b>SW WH-W N</b> lines a switch.</li>
          <li>Alerts under the board: a train heading for a signal at stop, or waiting at one.</li>
        </ul>
        <div class="flex items-center justify-between gap-3 px-3 pt-2 pb-2.5 text-[13px] text-neutral-400">
          Shows on your first visit. The ? button brings it back.
          <button type="button" class="h-[26px] bg-neutral-50 px-3 font-['Barlow_Condensed'] text-sm font-bold tracking-[.03em] text-black" @click="closeHelp">GOT IT</button>
        </div>
      </div>

      <CtcBoard
        ref="boardRef" :board="board" :title="title" :aspects="live.signals.aspects" :occupied="live.signals.occupied" :thrown="live.switches"
        :trains="trains" :selected-train="selected" :controls="controls" :alerts="alerts.map((a) => a.signal)" :desks="desks"
        @command="(a) => commandsRef?.send(a)" @train="(id) => (selected = id)"
      />
    </div>

    <div v-if="neighbors.length" class="flex flex-wrap border-t border-[#2a2a2a] text-[15px]">
      <div v-for="n in neighbors" :key="n.from.id" class="flex flex-1 basis-[420px] items-center gap-2 px-3.5 py-1.5 [&+&]:border-l [&+&]:border-[#2a2a2a]" :class="n.side === 'right' ? 'justify-end text-right' : ''">
        <span v-if="n.side === 'left'" class="text-neutral-400">&#9664;</span>
        <span>
          <b class="font-semibold text-neutral-50 uppercase">{{ n.from.name }}</b><span class="text-neutral-400 uppercase">, {{ n.from.holder ?? 'open' }}:</span>
          <template v-if="n.trains.length">
            <template v-for="(t, k) in n.trains" :key="t.id">{{ k ? ', ' : ' ' }}<span class="text-sky-300">{{ t.name }}</span> {{ t.miles.toFixed(1) }} MI FROM {{ n.town.toUpperCase() }}</template>
          </template>
          <span v-else class="text-neutral-400"> NOTHING HEADING YOUR WAY</span>
        </span>
        <span v-if="n.side === 'right'" class="text-neutral-400">&#9654;</span>
      </div>
    </div>

    <CtcAlerts class="border-t border-[#2a2a2a]" :alerts="alerts" :names="cpNames" @show="(x) => boardRef?.show(x)" />

    <div class="flex flex-wrap gap-x-[18px] gap-y-1 border-y border-[#2a2a2a] px-3.5 py-1.5 text-[13px] text-neutral-400">
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-red-500" />OCCUPIED</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-green-500" />ROUTE CLEARED</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-neutral-500" />IDLE</span>
      <span>SWITCH <span class="text-neutral-50">N</span> NORMAL, <span class="text-yellow-400">R</span> REVERSE. GAP ON THE LEG IT IS NOT LINED FOR</span>
      <span>MP = MILES FROM {{ line.towns[0]?.name.toUpperCase() }}</span>
      <span class="ml-auto">{{ working ? 'CLICK A SIGNAL, SWITCH OR TRAIN' : 'CLICK A TRAIN' }}</span>
    </div>

    <div class="flex flex-wrap">
      <CtcCommands v-if="working" ref="commandsRef" />
      <CtcEvents :board="board" :aspects="live.signals.aspects" :thrown="live.switches" />
      <CtcTrainSheet :train="train" :board="board" />
    </div>
  </div>
</template>
