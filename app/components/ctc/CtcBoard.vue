<script setup lang="ts">
import { onKeyStroke, useEventListener, useResizeObserver } from '@vueuse/core'

// The track display of the CTC console (CtcConsole.vue), as the agreed board designs E and K draw it: the whole line
// as a strip (trains as triangles, a box for the part in view; click it to move there), then the board, colored by what
// the game reports right now: occupied track red, track a dispatcher has routed through a control point green, signal
// heads by aspect, each switch's position with a gap on the leg it isn't lined for, and trains as tags on their track
// (click one for its train sheet). With `controllable`, clicking a control point signal offers Clear and Stop, and
// clicking a switch offers lining it normal or reverse; the choice is emitted as a command. Signals in `alerts` are ringed.
const props = defineProps<{
  board: Board
  title: string // the strip's heading, e.g. "MURPHY BRANCH, SYLVA to ANDREWS, 51 MI"
  aspects: Record<string, SignalAspect>
  occupied: Record<string, boolean>
  thrown: Record<string, boolean>
  trains: BoardTrain[]
  selectedTrain?: string
  controllable?: boolean
  alerts?: string[]
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
const trainWidth = (name: string) => name.length * 7.6 + 22

// The menu for the signal or switch clicked, just below it on the screen (fixed, so the board's scrolling area
// doesn't cut it off). Scrolling closes it.
interface MenuItem { label: string; action: CtcAction }
const menu = ref<{ x: number; y: number; title: string; items: MenuItem[] } | null>(null)
const below = (event: Event) => {
  const r = (event.currentTarget as Element).getBoundingClientRect()
  return { x: r.left, y: r.bottom + 4 }
}
const canClick = (h: BoardHead) => !!props.controllable && !h.intermediate && !!h.cp
const cpName = (id: string) => pointById.value.get(id)?.name ?? id
function openSignal(h: BoardHead, event: Event) {
  if (!canClick(h)) return
  const signal = h.signal
  // Facing out of the town: cleared from the track it stands on. Facing in, at a switch: cleared into either track.
  const clear: MenuItem[] = h.track === 'main' ? [{ label: 'Clear', action: { kind: 'clear', signal, setting: 'normal' } }]
    : h.track === 'siding' ? [{ label: 'Clear', action: { kind: 'clear', signal, setting: 'reverse' } }]
    : pointById.value.get(h.cp!)?.switch ? [
      { label: 'Clear into the main', action: { kind: 'clear', signal, setting: 'normal' } },
      { label: 'Clear into the siding', action: { kind: 'clear', signal, setting: 'reverse' } }
    ]
    : [{ label: 'Clear', action: { kind: 'clear', signal } }]
  menu.value = { ...below(event), title: `SIGNAL ${signal.toUpperCase()}`, items: [...clear, { label: `Stop ${cpName(h.cp!)}`, action: { kind: 'stop', cp: h.cp! } }] }
}
function openSwitch(p: BoardPoint, event: Event) {
  if (!props.controllable || !p.switch) return
  menu.value = {
    ...below(event), title: `SWITCH AT ${p.name}`,
    items: [
      { label: 'Line normal', action: { kind: 'throw', cp: p.id, setting: 'normal' } },
      { label: 'Line reverse', action: { kind: 'throw', cp: p.id, setting: 'reverse' } }
    ]
  }
}
function choose(item: MenuItem) {
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
function syncView() {
  const el = scroller.value
  if (!el) return
  view.left = el.scrollLeft / props.board.width
  view.width = Math.min(1, el.clientWidth / props.board.width)
}
function jump(event: MouseEvent) {
  const el = scroller.value
  const strip = event.currentTarget as HTMLElement
  if (!el) return
  const r = strip.getBoundingClientRect()
  el.scrollTo({ left: ((event.clientX - r.left) / r.width) * props.board.width - el.clientWidth / 2, behavior: 'smooth' })
}
// Scrolls the board so board position x is in the middle (an alert's Show).
function show(x: number) {
  const el = scroller.value
  if (el) el.scrollTo({ left: x - el.clientWidth / 2, behavior: 'smooth' })
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
  </section>

  <section ref="scroller" aria-label="Track display" class="relative overflow-x-auto" @scroll.passive="syncView">
    <svg :width="board.width" :height="height" :viewBox="`0 0 ${board.width} ${height}`" class="block" role="img" :aria-label="`CTC board, ${board.towns[0]?.name} to ${board.towns.at(-1)?.name}`">
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
        :class="controllable ? 'cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-400' : ''"
        :role="controllable ? 'button' : undefined" :tabindex="controllable ? 0 : undefined"
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
        v-for="t in trains" :key="t.id" class="cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-400" role="button" tabindex="0"
        :aria-label="`Train ${t.name}`" @click="emit('train', t.id)" @keydown.enter="emit('train', t.id)"
      >
        <rect :x="t.x - trainWidth(t.name) / 2" :y="t.y - 11" :width="trainWidth(t.name)" height="22" fill="#000" :stroke="t.id === selectedTrain ? '#fde047' : '#fafafa'" />
        <text :x="t.x" :y="t.y + 5" :fill="t.id === selectedTrain ? '#fde047' : '#fafafa'" font-size="15" font-weight="700" text-anchor="middle" letter-spacing=".04em">
          {{ t.right ? '' : '◀ ' }}{{ t.name }}{{ t.right ? ' ▶' : '' }}
        </text>
      </g>
    </svg>
    <div
      v-if="menu" class="fixed z-50 min-w-[168px] border border-neutral-600 bg-[#111] shadow-[0_8px_24px_rgba(0,0,0,.8)]"
      :style="{ left: `${menu.x - 8}px`, top: `${menu.y}px` }" role="menu" :aria-label="menu.title"
    >
      <div class="flex items-center justify-between border-b border-[#2a2a2a] px-2 py-1 text-[13px] font-bold text-neutral-50">
        {{ menu.title }}<button type="button" class="px-1 text-sm font-semibold text-neutral-400" aria-label="Close" @click="menu = null">X</button>
      </div>
      <button
        v-for="item in menu.items" :key="item.label" type="button" role="menuitem"
        class="block w-full border-t border-[#1f1f1f] px-2.5 py-1.5 text-left text-[15px] font-semibold tracking-[.03em] text-neutral-50 uppercase first-of-type:border-t-0 hover:bg-neutral-900 focus-visible:bg-neutral-900 focus-visible:outline-none"
        @click="choose(item)"
      >{{ item.label }}</button>
    </div>
  </section>
</template>
