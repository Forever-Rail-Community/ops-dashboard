<script setup lang="ts">
import { Eye } from '@lucide/vue'
import { onKeyStroke, useEventListener, useResizeObserver } from '@vueuse/core'

// The track display of the CTC console (CtcConsole.vue), as the agreed board designs E and K draw it: the whole line
// as a strip (trains as triangles, a box for the part in view; click it to move there), then the board, colored by what
// the game reports right now: occupied track red, track a dispatcher has routed through a control point green, signal
// heads by aspect, each switch's position with a gap on the leg it isn't lined for, and trains as tags on their track
// (click one for its train sheet). At the control points in `controls`, clicking a signal offers Clear and Stop, and
// clicking a switch offers lining it normal or reverse; the choice is emitted as a command. Signals in `alerts` are
// ringed. With `desks`, the strip shows who's on each desk. With `keepTo`, the board scrolls only across those desks
// (yours, or the one being watched, and a little either side), dims the rest, and only their trains can be clicked.
// The desk in `watching` is marked in yellow with an eye, so a watcher always knows which desk they're looking at.
// A signal's Clear is offered only once its control point's switch is lined for it (clearNeeds): clearing never
// throws a switch.
const props = defineProps<{
  board: Board
  title: string // the strip's heading, e.g. "MURPHY BRANCH, SYLVA to ANDREWS, 51 MI"
  aspects: Record<string, SignalAspect>
  occupied: Record<string, boolean>
  thrown: Record<string, boolean>
  trains: BoardTrain[]
  selectedTrain?: string
  controls?: string[] // control points this dispatcher can work
  alerts?: string[]
  desks?: BoardDesk[]
  keepTo?: string[] // desk ids
  watching?: string // desk id
}>()
const emit = defineEmits<{ command: [action: CtcAction]; train: [id: string] }>()

const OPEN = 13 // px gap at the points on the leg a switch isn't lined for
const ASPECT_COLOR: Record<SignalAspect, string> = {
  stop: '#ef4444', approach: '#facc15', divergingApproach: '#facc15', clear: '#22c55e', divergingClear: '#22c55e', restricting: '#f59e0b', unknown: '#737373'
}
const ASPECT_TEXT: Record<SignalAspect, string> = {
  stop: 'Stop', approach: 'Approach', divergingApproach: 'Diverging approach', clear: 'Clear', divergingClear: 'Diverging clear', restricting: 'Restricting', unknown: 'Not reported'
}

const routed = computed(() => routedBlocks(props.board, props.aspects, props.thrown))
const colorOf = (block: string) => (props.occupied[block] ? '#ef4444' : routed.value.has(block) ? '#22c55e' : '#737373')
const pointById = computed(() => new Map(props.board.points.map((p) => [p.id, p])))
const thrownAt = (cp?: string) => {
  const sw = cp ? pointById.value.get(cp)?.switch : undefined
  return sw ? props.thrown[sw] : undefined
}

// Track pieces, with the open leg shortened at the points.
const pieces = computed(() =>
  props.board.pieces.map((p) => {
    let { x1, y1, x2, y2 } = p
    if ((p.kind === 'leg' || p.kind === 'stub') && thrownAt(p.cp) === false) {
      const t = OPEN / Math.hypot(x2 - x1, y2 - y1)
      if (Math.abs(x1 - (pointById.value.get(p.cp!)?.x ?? -1)) < 1) {
        x1 += (x2 - x1) * t
        y1 += (y2 - y1) * t
      } else {
        x2 -= (x2 - x1) * t
        y2 -= (y2 - y1) * t
      }
    }
    return { ...p, x1, y1, x2, y2, color: colorOf(p.block), title: `${p.block}${props.occupied[p.block] ? ', occupied' : routed.value.has(p.block) ? ', routed' : ''}` }
  })
)
// A switch lined reverse leaves the main open at its points.
const mainGaps = computed(() =>
  props.board.points.filter((p) => p.side !== 'only' && thrownAt(p.id) === true).map((p) => ({ x1: p.x, x2: p.x + (p.side === 'left' ? OPEN : -OPEN) }))
)
const switches = computed(() =>
  props.board.points.filter((p) => p.switch).map((p) => {
    const thrown = props.thrown[p.switch!]
    return { ...p, letter: thrown === true ? 'R' : thrown === false ? 'N' : '?', color: thrown === true ? '#f59e0b' : '#fafafa' }
  })
)
const heads = computed(() =>
  props.board.heads.map((h) => {
    const aspect = props.aspects[h.signal] ?? 'unknown'
    const s = h.intermediate ? 0.8 : 1
    const y = h.dir > 0 ? h.y - 15 : h.y + 15
    const d = h.dir
    const back = h.x - d * BOARD.headBack * s
    // A gray mast, then an arrowhead in the aspect's color pointing the way it faces.
    const mast = `M${back} ${y - 5 * s} V${y + 5 * s} M${back} ${y} H${h.x - d * 2 * s}`
    const arrow = `M${h.x - d * 2 * s} ${y - 5 * s} L${h.x + d * BOARD.headTip * s} ${y} L${h.x - d * 2 * s} ${y + 5 * s} Z`
    return { key: h.signal, head: h, y, mast, arrow, color: ASPECT_COLOR[aspect], title: `${h.signal}: ${ASPECT_TEXT[aspect]}`, clickable: canClick(h), alert: props.alerts?.includes(h.signal) ?? false }
  })
)
const labelWidth = (text: string) => text.length * 7 + 14
const trainWidth = (name: string) => name.length * 7.6 + 24
// Each train's tag, off the track as board E draws it: below the main or the line, above a siding. The border is red
// while it's moving, gray when stopped, and blue when it's the one picked; with no symbols yet, names are light blue.
const tags = computed(() =>
  props.trains.map((t) => ({
    ...t,
    top: t.track === 'siding' ? t.y - BOARD.trainAbove : t.y + BOARD.trainBelow,
    border: t.id === props.selectedTrain ? '#38bdf8' : t.speedMph >= 1 ? '#ef4444' : '#a3a3a3',
    width: trainWidth(t.name)
  }))
)

// The menu for the signal or switch clicked, just below it on the screen (fixed, so the board's scrolling area
// doesn't cut it off). Scrolling closes it.
interface MenuItem { label: string; action: CtcAction; blocked?: string } // blocked: why it can't be sent yet
const menu = ref<{ x: number; y: number; title: string; items: MenuItem[] } | null>(null)
const below = (event: Event) => {
  const r = (event.currentTarget as Element).getBoundingClientRect()
  return { x: r.left, y: r.bottom + 4 }
}
const controlled = computed(() => new Set(props.controls))
const canClick = (h: BoardHead) => !h.intermediate && !!h.cp && controlled.value.has(h.cp)
const cpName = (id: string) => pointById.value.get(id)?.name ?? id
function openSignal(h: BoardHead, event: Event) {
  if (!canClick(h)) return
  const signal = h.signal
  // Stop is only offered while one of the control point's signals is showing something other than stop.
  const anyCleared = props.board.heads.some((x) => x.cp === h.cp && (props.aspects[x.signal] ?? 'stop') !== 'stop')
  // Cleared for the route as the switch is lined now. One on the town's main or siding needs the switch lined for it.
  const needs = clearNeeds(props.board, signal, props.thrown)
  const clear: MenuItem[] = [{ label: 'Clear', action: { kind: 'clear', signal }, blocked: needs ? `Line the switch ${needs.setting} first` : undefined }]
  const stop: MenuItem[] = anyCleared ? [{ label: `Stop ${cpName(h.cp!)}`, action: { kind: 'stop', cp: h.cp! } }] : []
  menu.value = { ...below(event), title: `SIGNAL ${signal.toUpperCase()}`, items: [...clear, ...stop] }
}
function openSwitch(p: BoardPoint, event: Event) {
  if (!p.switch || !controlled.value.has(p.id)) return
  menu.value = {
    ...below(event), title: `SWITCH AT ${p.name}`,
    items: [
      { label: 'Line normal', action: { kind: 'throw', cp: p.id, setting: 'normal' } },
      { label: 'Line reverse', action: { kind: 'throw', cp: p.id, setting: 'reverse' } }
    ]
  }
}
function choose(item: MenuItem) {
  if (item.blocked) return
  menu.value = null
  emit('command', item.action)
}
onKeyStroke('Escape', () => (menu.value = null))
useEventListener('scroll', () => (menu.value = null), { capture: true, passive: true })

// The strip: where each town and each train falls along the whole line, as a share of the board's width.
const scroller = ref<HTMLElement>()
const view = reactive({ left: 0, width: 1 })
const share = (x: number) => `${(x / props.board.width) * 100}%`
const { height, main: mainY } = BOARD
// The part of the board that scrolls: the whole line, or with keepTo those desks and a little of the ones either side.
const NEIGHBOR_PX = 160
const kept = computed(() => (props.desks ?? []).filter((d) => props.keepTo?.includes(d.id)))
const range = computed(() =>
  kept.value.length
    ? { lo: Math.max(0, Math.min(...kept.value.map((d) => d.x1)) - NEIGHBOR_PX), hi: Math.min(props.board.width, Math.max(...kept.value.map((d) => d.x2)) + NEIGHBOR_PX) }
    : { lo: 0, hi: props.board.width })
const pickable = (x: number) => !kept.value.length || kept.value.some((d) => x >= d.x1 && x < d.x2)
function syncView() {
  const el = scroller.value
  if (!el) return
  view.left = (el.scrollLeft + range.value.lo) / props.board.width
  view.width = Math.min(1, el.clientWidth / props.board.width)
}
function jump(event: MouseEvent) {
  const el = scroller.value
  const strip = event.currentTarget as HTMLElement
  if (!el) return
  const r = strip.getBoundingClientRect()
  el.scrollTo({ left: ((event.clientX - r.left) / r.width) * props.board.width - range.value.lo - el.clientWidth / 2, behavior: 'smooth' })
}
// Scrolls the board so board position x is in the middle (an alert's Show).
function show(x: number) {
  const el = scroller.value
  if (el) el.scrollTo({ left: x - range.value.lo - el.clientWidth / 2, behavior: 'smooth' })
}
defineExpose({ show })
useResizeObserver(scroller, syncView)
onMounted(syncView)
</script>

<template>
  <section aria-label="The whole line" class="border-b border-[#2a2a2a] bg-[#050505] px-3.5 pt-1.5 pb-2">
    <div class="flex flex-wrap justify-between gap-x-4 text-[13px] text-neutral-400">
      <span>{{ title }}</span><span>TRIANGLES ARE TRAINS. THE BOX IS WHAT THIS BOARD SHOWS.</span>
    </div>
    <button type="button" class="relative mt-1 block h-[52px] w-full cursor-pointer text-left" aria-label="Move the board along the line" @click="jump">
      <span
        v-for="(town, k) in board.towns" :key="town.name" class="absolute text-[13px] whitespace-nowrap text-neutral-400 uppercase"
        :class="k % 2 ? 'top-[33px]' : 'top-0'"
        :style="{ left: share(town.x), transform: k === 0 ? 'none' : k === board.towns.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }"
      >{{ town.name }} {{ town.milepost.toFixed(1) }}</span>
      <span class="absolute inset-x-0 top-[24px] h-[3px] bg-neutral-700" />
      <span
        v-for="t in trains" :key="t.id" :title="`${t.name}, ${t.right ? 'toward' : 'from'} ${board.towns.at(-1)?.name}`"
        class="absolute top-[19px] size-0 -translate-x-1/2 border-y-[7px] border-y-transparent"
        :class="t.right ? 'border-l-[9px] border-l-neutral-50' : 'border-r-[9px] border-r-neutral-50'"
        :style="{ left: share(t.x) }"
      />
      <span class="pointer-events-none absolute top-[15px] h-5 border border-neutral-50" :style="{ left: `${view.left * 100}%`, width: `${view.width * 100}%` }" />
    </button>
    <div v-if="desks?.length" class="relative mt-1 h-[22px]">
      <span
        v-for="d in desks" :key="d.id" class="absolute inset-y-0 truncate border-x border-[#050505] px-1.5 text-[13px]/[22px] uppercase"
        :class="d.mine ? 'bg-sky-950 text-sky-200' : d.id === watching ? 'bg-yellow-950 text-yellow-200' : d.holder ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-900 text-neutral-500'"
        :style="{ left: share(d.x1), width: share(d.x2 - d.x1) }" :title="`${d.name}: ${d.mine ? 'you' : d.holder ?? 'open'}${d.id === watching ? ', watching' : ''}`"
      ><Eye v-if="d.id === watching" class="mr-1 inline size-3.5 align-[-2px]" aria-hidden="true" /><b class="font-semibold">{{ d.name }}</b>
        {{ d.mine ? 'YOU' : d.holder ?? 'OPEN' }}<template v-if="d.id === watching">, WATCHING</template></span>
    </div>
  </section>

  <section ref="scroller" aria-label="Track display" class="relative overflow-x-auto" @scroll.passive="syncView">
    <svg :width="range.hi - range.lo" :height="height" :viewBox="`${range.lo} 0 ${range.hi - range.lo} ${height}`" class="block" role="img" :aria-label="`CTC board, ${board.towns[0]?.name} to ${board.towns.at(-1)?.name}`">
      <template v-for="d in desks" :key="`d${d.id}`">
        <line v-if="d.x1 > 0" :x1="d.x1" y1="0" :x2="d.x1" :y2="height" stroke="#525252" stroke-dasharray="4 4" />
        <text :x="d.x1 + 8" :y="height - 8" :fill="d.mine ? '#7dd3fc' : d.id === watching ? '#fde047' : '#737373'" font-size="13" font-weight="700" class="uppercase">
          {{ d.name }}, {{ d.mine ? 'YOU' : d.holder ?? 'OPEN' }}
        </text>
      </template>
      <g v-for="town in board.towns" :key="town.name" text-anchor="middle">
        <text :x="town.x" y="22" fill="#a3a3a3" font-size="13">
          MP {{ town.milepost.toFixed(1) }}<title v-if="town.measured">Measured along the track from {{ board.towns[0]?.name }}</title>
        </text>
        <text :x="town.x" y="44" fill="#fafafa" font-size="17" font-weight="700" class="uppercase">{{ town.name }}</text>
      </g>

      <line v-for="(p, k) in pieces" :key="`p${k}`" :x1="p.x1" :y1="p.y1" :x2="p.x2" :y2="p.y2" :stroke="p.color" stroke-width="6">
        <title>{{ p.title }}</title>
      </line>
      <line v-for="(g, k) in mainGaps" :key="`g${k}`" :x1="g.x1" :y1="mainY" :x2="g.x2" :y2="mainY" stroke="#000" stroke-width="8" />

      <g v-for="p in board.points" :key="p.id">
        <rect :x="p.x - labelWidth(p.name) / 2" :y="(p.side === 'right' ? 86 : 110) - 15" :width="labelWidth(p.name)" height="21" fill="#0a0a0a" stroke="#525252" />
        <text :x="p.x" :y="(p.side === 'right' ? 86 : 110) + 1" fill="#fafafa" font-size="14" font-weight="700" text-anchor="middle" class="uppercase">{{ p.name }}</text>
        <title>{{ p.id }}</title>
      </g>
      <g
        v-for="sw in switches" :key="`s${sw.id}`"
        :class="controlled.has(sw.id) ? 'cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-400' : ''"
        :role="controlled.has(sw.id) ? 'button' : undefined" :tabindex="controlled.has(sw.id) ? 0 : undefined"
        :aria-label="`Switch at ${sw.name}, ${sw.letter === 'R' ? 'reverse' : sw.letter === 'N' ? 'normal' : 'not reported'}`"
        @click="openSwitch(sw, $event)" @keydown.enter="openSwitch(sw, $event)"
      >
        <rect :x="sw.x - 11" :y="mainY + 34" width="22" height="18" fill="#000" :stroke="sw.color" />
        <text :x="sw.x" :y="mainY + 48" :fill="sw.color" font-size="13" font-weight="700" text-anchor="middle">{{ sw.letter }}</text>
        <title>Switch {{ sw.switch }}: {{ sw.letter === 'R' ? 'reverse' : sw.letter === 'N' ? 'normal' : 'not reported' }}</title>
      </g>
      <g
        v-for="h in heads" :key="h.key"
        :class="h.clickable ? 'cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-sky-400' : ''"
        :role="h.clickable ? 'button' : undefined" :tabindex="h.clickable ? 0 : undefined" :aria-label="h.clickable ? `Signal ${h.title}` : undefined"
        @click="openSignal(h.head, $event)" @keydown.enter="openSignal(h.head, $event)"
      >
        <circle v-if="h.alert" :cx="h.head.x" :cy="h.y" r="13" fill="none" stroke="#ef4444" stroke-width="2" />
        <circle v-if="h.clickable" class="ring" :cx="h.head.x" :cy="h.y" r="11" fill="transparent" stroke="transparent" stroke-width="2" />
        <path :d="h.mast" stroke="#a3a3a3" stroke-width="1.5" fill="none" />
        <path :d="h.arrow" :fill="h.color" />
        <title>{{ h.title }}</title>
      </g>
      <g
        v-for="t in tags" :key="t.id" :class="pickable(t.x) ? 'cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-300' : 'opacity-60'"
        :role="pickable(t.x) ? 'button' : undefined" :tabindex="pickable(t.x) ? 0 : undefined"
        :aria-label="`Train ${t.name}, ${t.speedMph >= 1 ? 'moving' : 'stopped'}`"
        @click="pickable(t.x) && emit('train', t.id)" @keydown.enter="pickable(t.x) && emit('train', t.id)"
      >
        <rect :x="t.x - t.width / 2" :y="t.top" :width="t.width" height="22" fill="#000" :stroke="t.border" />
        <path v-if="!t.right" :d="`M${t.x - t.width / 2 + 13} ${t.top + 6} v10 l-7 -5 z`" fill="#7dd3fc" />
        <path v-else :d="`M${t.x + t.width / 2 - 13} ${t.top + 6} v10 l7 -5 z`" fill="#7dd3fc" />
        <text :x="t.x + (t.right ? -4 : 4)" :y="t.top + 16" fill="#7dd3fc" font-size="15" font-weight="700" text-anchor="middle" letter-spacing=".04em">{{ t.name }}</text>
      </g>
      <template v-for="d in desks" :key="`dim${d.id}`">
        <rect v-if="kept.length && !keepTo?.includes(d.id)" :x="d.x1" y="24" :width="d.x2 - d.x1" :height="height - 24" fill="#000" opacity=".45" class="pointer-events-none" />
      </template>
    </svg>
    <div
      v-if="menu" class="fixed z-50 min-w-[168px] border border-neutral-600 bg-[#111] shadow-[0_8px_24px_rgba(0,0,0,.8)]"
      :style="{ left: `${menu.x - 8}px`, top: `${menu.y}px` }" role="menu" :aria-label="menu.title"
    >
      <div class="flex items-center justify-between border-b border-[#2a2a2a] px-2 py-1 text-[13px] font-bold text-neutral-50">
        {{ menu.title }}<button type="button" class="px-1 text-sm font-semibold text-neutral-400" aria-label="Close" @click="menu = null">X</button>
      </div>
      <button
        v-for="item in menu.items" :key="item.label" type="button" role="menuitem" :aria-disabled="!!item.blocked"
        class="block w-full border-t border-[#1f1f1f] px-2.5 py-1.5 text-left text-[15px] font-semibold tracking-[.03em] uppercase first-of-type:border-t-0 focus-visible:bg-neutral-900 focus-visible:outline-none"
        :class="item.blocked ? 'cursor-not-allowed text-neutral-500' : 'text-neutral-50 hover:bg-neutral-900'"
        @click="choose(item)"
      >{{ item.label }}<span v-if="item.blocked" class="block text-[13px] font-medium text-yellow-400">{{ item.blocked }}</span></button>
    </div>
  </section>
</template>
