<script setup lang="ts">
// The CTC console, as the agreed board designs show it (CTC Board Prototypes canvas, boards E, G, K, L and M): a status
// strip (line, dispatcher, game link, clock, help), the track display (CtcBoard.vue), alerts, a legend, and the
// COMMANDS, EVENTS and TRAIN columns. With desks (shared/types/ctcDesks.ts), the strip shows who's on each, the board
// keeps to yours, only your desks' control points can be worked, and the neighbors row shows what's coming in.
// Watching a desk (`watch`, from Watch on the Desks page or here) keeps the board to that desk and marks it in yellow.
// A dispatcher who's on no desk and watching none is off duty: they choose a desk to watch, or go clock in to one, rather than
// being put to watching. A line with no desks set up is worked as one, by anyone who can control the board.
// Clock out is in the strip too (FOR-26), with the same turnover note as on the Desks page; the page does the saving.
import { Eye } from '@lucide/vue'
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
  watch?: string // the desk being watched, if any
  sound?: boolean // the line's "play a sound" rule (Edit desks)
  busy?: boolean // a clock-out is being saved
}>()
const emit = defineEmits<{ line: [id: string]; watch: [id?: string]; leave: [id: string, note: { items: string[]; text: string }] }>()

const board = computed(() => boardLayout(props.line, props.layout))
const directions: TrainDirections = new Map() // kept between refreshes, so a train's arrow doesn't flick the wrong way
const trains = computed(() => boardTrains(board.value, props.layout, props.live.signals.aspects, props.live.trains, directions))
const spans = computed(() => deskSpans(props.line, props.desks.filter((d) => d.lineId === props.line.id)))
const desks = computed(() => boardDesks(props.line, board.value, spans.value, props.userId))
const mine = computed(() => desks.value.filter((d) => d.mine))
const controls = computed(() =>
  !props.controllable ? [] : spans.value.length ? mine.value.flatMap((d) => d.span.controlPoints) : props.layout.controlPoints.map((cp) => cp.id))
const working = computed(() => controls.value.length > 0)
// Control points with a switch released for hand throwing: the game holds their switch block occupied until it's
// locked again, so each is an alert, with Lock where this dispatcher works it.
const released = computed(() =>
  board.value.points.filter((p) => p.switch && props.live.signals.released[p.switch]).map((p) => ({ cp: p.id, x: p.x, canLock: controls.value.includes(p.id) })))
const watched = computed(() => desks.value.find((d) => d.id === props.watch && !d.mine))
// The desks you're on: by name for one or two, as a count for more (up to DESK_LINE_MAX), with the names on hover.
const onDutyNames = computed(() => mine.value.map((d) => d.name).join(' + '))
const onDuty = computed(() => (mine.value.length <= 2 ? onDutyNames.value : `${mine.value.length} desks`).toUpperCase())
const leaving = ref<BoardDesk>()
const CLOCK_OUT_BUTTON = 'border border-neutral-600 px-2 font-semibold text-neutral-200 hover:border-neutral-400 hover:text-neutral-50 disabled:opacity-50'
// The desks the board keeps to: the one being watched, or yours.
const kept = computed(() => (watched.value ? [watched.value] : mine.value))
const offDuty = computed(() => props.controllable && desks.value.length > 0 && !mine.value.length && !watched.value)
const role = computed(() => (working.value ? 'DISPATCHER' : props.controllable && desks.value.length ? 'OFF DUTY' : 'VIEWING'))
const neighbors = computed(() => (watched.value ? [] : incoming(board.value, desks.value, trains.value)))
// Alerts, worked out on each refresh; `since` remembers when each train was first seen at its signal.
const since = new Map<string, number>()
// On a desk (or watching one), only its own alerts; the desks either side have their own dispatchers or the game's panel.
const alerts = computed(() => ctcAlerts(board.value, props.layout, props.live.signals.aspects, props.live.signals.occupied, props.live.trains, since)
  .filter((a) => !kept.value.length || kept.value.some((d) => a.x >= d.x1 && a.x < d.x2)))
const selected = ref<string>()
const train = computed(() => trains.value.find((t) => t.id === selected.value))
const cpNames = computed(() => new Map(props.layout.controlPoints.map((cp) => [cp.id, cp.name])))
const span = computed(() => `${props.line.towns[0]?.name} to ${props.line.towns.at(-1)?.name}`.toUpperCase())
const title = computed(() => `${props.line.name.toUpperCase()}, ${span.value}, ${Math.round(board.value.miles)} MI`)

const boardRef = ref<{ show: (x: number) => void }>()
// Opens at the start of the desk it keeps to, and goes there when that changes.
watch(() => kept.value[0]?.id, () => {
  const desk = kept.value[0]
  if (desk) nextTick(() => boardRef.value?.show(desk.x1 + 480))
}, { immediate: true })
const commandsRef = ref<{ send: (action: CtcAction) => Promise<void> }>()
// A clear waits for its switch to be lined (clearNeeds): clearing never throws a switch.
function check(action: CtcAction) {
  if (action.kind !== 'clear') return null
  const needs = clearNeeds(board.value, action.signal, props.live.switches)
  return needs ? `Line the switch at ${(cpNames.value.get(needs.cp) ?? needs.cp).toUpperCase()} ${needs.setting.toUpperCase()} first: SW ${needs.cp.toUpperCase()} ${needs.setting === 'normal' ? 'N' : 'R'}.` : null
}

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
      <span v-if="mine.length" class="text-sky-300" :title="onDutyNames">{{ onDuty }}</span>
      <button v-if="mine.length === 1" type="button" :disabled="busy" :class="CLOCK_OUT_BUTTON" @click="leaving = mine[0]">CLOCK OUT</button>
      <!-- Covering several desks (up to DESK_LINE_MAX): one button, and a list to choose which. -->
      <DropdownMenu v-else-if="mine.length">
        <DropdownMenuTrigger as-child>
          <button type="button" :disabled="busy" :class="CLOCK_OUT_BUTTON">CLOCK OUT &#9662;</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="max-h-80">
          <DropdownMenuLabel class="text-xs font-normal text-muted-foreground">Clock out of</DropdownMenuLabel>
          <DropdownMenuItem v-for="d in mine" :key="d.id" @select="leaving = d">{{ d.name }}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <span v-if="watched" class="inline-flex items-center gap-1.5 border border-yellow-500 bg-yellow-950 px-2 font-semibold text-yellow-300">
        <Eye class="size-4" aria-hidden="true" />WATCHING {{ watched.name.toUpperCase() }}
        <button type="button" class="ml-1 text-yellow-400 hover:text-yellow-200" aria-label="Stop watching" title="Stop watching" @click="emit('watch')">&#10005;</button>
      </span>
      <span class="ml-auto text-neutral-400">{{ role }} <span class="font-semibold text-neutral-50">{{ dispatcher.toUpperCase() }}</span></span>
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
          <li>Track colors: <b class="text-red-400">red</b> has a train on it, <b class="text-green-400">green</b> is a route cleared through a control point, and gray is empty. Red over a switch means its control point's switch block is occupied: by a train, a switch released for hand throwing, or a block set by the dispatcher.</li>
          <li v-if="desks.length">The row under the strip shows each desk and who's on it. You can control only the desks you are clocked in to (on the Desks page). The others are dimmed.</li>
          <li v-if="working">Click a switch's <b>N</b> or <b>R</b> to line it, and a signal to clear or stop it. A signal clears only once its switch is lined for it. Click a train for its details.</li>
          <li v-else-if="controllable">Click a train for its details. Clock in to a desk on the Desks page to work its signals and switches.</li>
          <li v-else>Click a train for its details. Working the line needs the "Clear signals and throw switches" permission.</li>
          <li v-if="working">Each command shows <b>SENT</b> until the game answers, then <b>CONFIRMED</b> or <b>REJECTED</b> with the reason. Click a command to see who sent it, how long the game took, and the game's full answer.</li>
          <li v-if="working">Prefer typing? <b>SW WH-W R</b> lines a switch reverse, <b>CLR WH-WS</b> clears a signal, and <b>STOP WH-W</b> stops a control point.</li>
          <li v-if="desks.length">Watching a desk keeps the board to it and marks it in yellow. The &#10005; beside it stops watching.</li>
          <li>Alerts under the board: a train stopped at a signal at stop.</li>
        </ul>
        <div class="flex items-center justify-between gap-3 px-3 pt-2 pb-2.5 text-[13px] text-neutral-400">
          Shows on your first visit. The ? button brings it back.
          <button type="button" class="h-[26px] bg-neutral-50 px-3 font-['Barlow_Condensed'] text-sm font-bold tracking-[.03em] text-black" @click="closeHelp">GOT IT</button>
        </div>
      </div>

      <div v-if="offDuty" class="grid gap-3 px-3.5 py-6 font-[Barlow] text-[15px] tracking-normal">
        <p><b class="font-['Barlow_Condensed'] text-base tracking-[.03em] text-neutral-50">YOU ARE OFF DUTY.</b> Clock in to a desk to dispatch, or select a desk to watch.</p>
        <div class="flex flex-wrap gap-2 font-['Barlow_Condensed'] text-sm font-bold tracking-[.03em]">
          <NuxtLink to="/railroader/desks" class="inline-flex h-[30px] items-center bg-neutral-50 px-3 text-black">GO TO DESKS</NuxtLink>
          <button
            v-for="d in desks" :key="d.id" type="button" class="inline-flex h-[30px] items-center gap-1.5 border border-neutral-500 px-3 text-neutral-200 hover:border-yellow-500 hover:text-yellow-300"
            @click="emit('watch', d.id)"
          ><Eye class="size-4" aria-hidden="true" /><span>WATCH {{ d.name.toUpperCase() }}<span class="font-medium text-neutral-500">, {{ (d.holder ?? 'open').toUpperCase() }}</span></span></button>
        </div>
      </div>
      <CtcBoard
        v-else ref="boardRef" :board="board" :title="title" :aspects="live.signals.aspects" :occupied="live.signals.occupied" :thrown="live.switches"
        :released="live.signals.released" :trains="trains" :selected-train="selected" :controls="controls" :alerts="alerts.map((a) => a.signal)" :desks="desks"
        :keep-to="kept.map((d) => d.id)" :watching="watched?.id"
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

    <CtcAlerts v-if="!offDuty" class="border-t border-[#2a2a2a]" :alerts="alerts" :released="released" :names="cpNames" :sound="sound"
      @show="(x) => boardRef?.show(x)" @lock="(cp) => commandsRef?.send({ kind: 'lock', cp })" />

    <div class="flex flex-wrap gap-x-[18px] gap-y-1 border-y border-[#2a2a2a] px-3.5 py-1.5 text-[13px] text-neutral-400">
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-red-500" />OCCUPIED</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-green-500" />ROUTE CLEARED</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-1.5 w-5 bg-neutral-500" />IDLE</span>
      <span>SWITCH <span class="text-neutral-50">N</span> NORMAL, <span class="text-yellow-400">R</span> REVERSE. GAP ON THE LEG IT IS NOT LINED FOR</span>
      <span>MP = MILES FROM {{ line.towns[0]?.name.toUpperCase() }}</span>
      <span class="ml-auto">{{ working ? 'CLICK A SIGNAL, SWITCH OR TRAIN' : 'CLICK A TRAIN' }}</span>
    </div>

    <div class="flex flex-wrap">
      <CtcCommands v-if="working" ref="commandsRef" :check="check" />
      <CtcEvents :board="board" :aspects="live.signals.aspects" :thrown="live.switches" />
      <CtcTrainSheet :train="train" :board="board" />
    </div>

    <CtcDeskClockOut
      v-model="leaving" :board="board" :aspects="live.signals.aspects" :thrown="live.switches" :trains="trains" :busy="busy"
      @leave="(id, note) => emit('leave', id, note)"
    />
  </div>
</template>
