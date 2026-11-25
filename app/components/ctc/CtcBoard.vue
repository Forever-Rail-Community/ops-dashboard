<script setup lang="ts">
import { onKeyStroke, useEventListener, useResizeObserver } from '@vueuse/core'

// A CTC board for one line (layout in app/utils/ctcBoard.ts), colored by what the game reports right now: occupied
// track red, track a dispatcher has routed through a control point green, signal heads by aspect, and each switch's
// position, with a gap on the leg it isn't lined for. A strip along the top shows the whole line; click it to move
// the board there. With `controllable`, clicking a control point signal offers Clear and Stop, and clicking a switch
// offers lining it normal or reverse; the choice is emitted as a command. Signals in `alerts` are ringed.
const props = defineProps<{
  board: Board
  aspects: Record<string, SignalAspect>
  occupied: Record<string, boolean>
  thrown: Record<string, boolean>
  controllable?: boolean
  alerts?: string[]
}>()
const emit = defineEmits<{ command: [action: CtcAction] }>()

const OPEN = 13 // px gap at the points on the leg a switch isn't lined for
const ASPECT_COLOR: Record<SignalAspect, string> = {
  stop: '#ef4444', approach: '#facc15', divergingApproach: '#facc15', clear: '#22c55e', divergingClear: '#22c55e', restricting: '#f59e0b', unknown: '#737373'
}
const ASPECT_TEXT: Record<SignalAspect, string> = {
  stop: 'Stop', approach: 'Approach', divergingApproach: 'Diverging approach', clear: 'Clear', divergingClear: 'Diverging clear', restricting: 'Restricting', unknown: 'Not reported'
}

const routed = computed(() => routedBlocks(props.board, props.aspects, props.thrown))
const colorOf = (block: string) => (props.occupied[block] ? '#ef4444' : routed.value.has(block) ? '#22c55e' : '#525252')
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
    // A mast, then an arrowhead pointing the way it faces.
    const path = `M${back} ${y - 5 * s} V${y + 5 * s} M${back} ${y} H${h.x - d * 2 * s} M${h.x - d * 2 * s} ${y - 5 * s} L${h.x + d * BOARD.headTip * s} ${y} L${h.x - d * 2 * s} ${y + 5 * s} Z`
    return { key: h.signal, head: h, path, color: ASPECT_COLOR[aspect], title: `${h.signal}: ${ASPECT_TEXT[aspect]}`, clickable: canClick(h), alert: props.alerts?.includes(h.signal) ?? false }
  })
)
const labelWidth = (text: string) => text.length * 7.4 + 14

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
  menu.value = { ...below(event), title: `Signal ${signal}`, items: [...clear, { label: `Stop ${cpName(h.cp!)}`, action: { kind: 'stop', cp: h.cp! } }] }
}
function openSwitch(p: BoardPoint, event: Event) {
  if (!props.controllable || !p.switch) return
  menu.value = {
    ...below(event), title: `Switch at ${p.name}`,
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

// The strip: where each town and each occupied block falls along the whole line, as a share of the board's width.
const scroller = ref<HTMLElement>()
const view = reactive({ left: 0, width: 1 })
// A share of the board's width as a position on the strip, which has 20px of margin each side.
const onStrip = (share: number) => `calc(20px + (100% - 40px) * ${share})`
const alongStrip = (share: number) => `calc((100% - 40px) * ${share})`
const occupiedSpans = computed(() =>
  pieces.value.filter((p) => props.occupied[p.block]).map((p) => ({ left: Math.min(p.x1, p.x2) / props.board.width, width: Math.abs(p.x2 - p.x1) / props.board.width }))
)
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
  <div class="overflow-hidden rounded-xl border bg-black text-neutral-200">
    <button type="button" class="relative block h-16 w-full cursor-pointer px-5 text-left" aria-label="Move the board along the line" @click="jump">
      <span class="absolute inset-x-5 top-[30px] h-[3px] bg-neutral-600" />
      <span v-for="(span, k) in occupiedSpans" :key="k" class="absolute top-[28px] h-[7px] bg-red-500" :style="{ left: onStrip(span.left), width: alongStrip(span.width) }" />
      <span v-for="(town, k) in board.towns" :key="town.name" class="absolute top-6 h-[15px] w-px bg-neutral-400" :style="{ left: onStrip(town.x / board.width) }">
        <span class="absolute left-1/2 -translate-x-1/2 text-xs whitespace-nowrap text-neutral-400 uppercase" :class="k % 2 ? 'top-[17px]' : '-top-[19px]'">{{ town.name }}</span>
      </span>
      <span class="pointer-events-none absolute top-5 h-[22px] border border-neutral-100" :style="{ left: onStrip(view.left), width: alongStrip(view.width) }" />
    </button>

    <div ref="scroller" class="relative overflow-x-auto border-t border-neutral-800" @scroll.passive="syncView">
      <svg :width="board.width" :height="height" :viewBox="`0 0 ${board.width} ${height}`" class="block" role="img" :aria-label="`CTC board, ${board.towns[0]?.name} to ${board.towns.at(-1)?.name}`">
        <g v-for="town in board.towns" :key="town.name" text-anchor="middle">
          <text :x="town.x" y="24" fill="#a3a3a3" font-size="13">
            MP {{ town.milepost.toFixed(1) }}<title v-if="town.measured">Measured along the track from {{ board.towns[0]?.name }}</title>
          </text>
          <text :x="town.x" y="45" fill="#fafafa" font-size="15" font-weight="600" class="uppercase">{{ town.name }}</text>
        </g>

        <line v-for="(p, k) in pieces" :key="`p${k}`" :x1="p.x1" :y1="p.y1" :x2="p.x2" :y2="p.y2" :stroke="p.color" stroke-width="5">
          <title>{{ p.title }}</title>
        </line>
        <line v-for="(g, k) in mainGaps" :key="`g${k}`" :x1="g.x1" :y1="mainY" :x2="g.x2" :y2="mainY" stroke="#000" stroke-width="7" />

        <g v-for="p in board.points" :key="p.id">
          <rect :x="p.x - labelWidth(p.name) / 2" :y="(p.side === 'right' ? 86 : 110) - 15" :width="labelWidth(p.name)" height="21" fill="#000" stroke="#404040" />
          <text :x="p.x" :y="(p.side === 'right' ? 86 : 110) + 1" fill="#fafafa" font-size="13.5" font-weight="600" text-anchor="middle" class="uppercase">{{ p.name }}</text>
          <title>{{ p.id }}</title>
        </g>
        <g
          v-for="sw in switches" :key="`s${sw.id}`"
          :class="controllable ? 'cursor-pointer outline-none [&:focus-visible>rect]:stroke-sky-400' : ''"
          :role="controllable ? 'button' : undefined" :tabindex="controllable ? 0 : undefined"
          @click="openSwitch(sw, $event)" @keydown.enter="openSwitch(sw, $event)"
        >
          <rect :x="sw.x - 9" :y="mainY + 34" width="18" height="18" :fill="controllable ? '#000' : 'none'" :stroke="sw.color" />
          <text :x="sw.x" :y="mainY + 48" :fill="sw.color" font-size="13" font-weight="600" text-anchor="middle">{{ sw.letter }}</text>
          <title>Switch {{ sw.switch }}: {{ sw.letter === 'R' ? 'reverse' : sw.letter === 'N' ? 'normal' : 'not reported' }}</title>
        </g>
        <g
          v-for="h in heads" :key="h.key"
          :class="h.clickable ? 'cursor-pointer outline-none [&:focus-visible>circle.ring]:stroke-sky-400' : ''"
          :role="h.clickable ? 'button' : undefined" :tabindex="h.clickable ? 0 : undefined"
          @click="openSignal(h.head, $event)" @keydown.enter="openSignal(h.head, $event)"
        >
          <circle v-if="h.alert" :cx="h.head.x" :cy="h.head.dir > 0 ? h.head.y - 15 : h.head.y + 15" r="13" fill="none" stroke="#f59e0b" stroke-width="2" />
          <circle v-if="h.clickable" class="ring" :cx="h.head.x" :cy="h.head.dir > 0 ? h.head.y - 15 : h.head.y + 15" r="11" fill="transparent" stroke="transparent" stroke-width="2" />
          <path :d="h.path" :stroke="h.color" :fill="h.color" stroke-width="1.6" />
          <title>{{ h.title }}</title>
        </g>
      </svg>
      <div
        v-if="menu" class="fixed z-50 min-w-44 rounded-md border border-neutral-700 bg-neutral-900 p-1 text-sm shadow-lg"
        :style="{ left: `${menu.x - 8}px`, top: `${menu.y}px` }" role="menu" :aria-label="menu.title"
      >
        <p class="px-2 py-1 text-xs text-neutral-400">{{ menu.title }}</p>
        <button
          v-for="item in menu.items" :key="item.label" type="button" role="menuitem"
          class="block w-full rounded px-2 py-1.5 text-left text-neutral-100 hover:bg-neutral-800 focus-visible:bg-neutral-800 focus-visible:outline-none"
          @click="choose(item)"
        >{{ item.label }}</button>
        <button type="button" class="block w-full rounded px-2 py-1.5 text-left text-neutral-400 hover:bg-neutral-800" @click="menu = null">Cancel</button>
      </div>
    </div>

    <div class="flex flex-wrap gap-x-6 gap-y-2 border-t border-neutral-800 px-5 py-3 text-xs text-neutral-400 uppercase">
      <span><i class="mr-2 inline-block h-[5px] w-5 bg-red-500 align-middle" />Occupied</span>
      <span><i class="mr-2 inline-block h-[5px] w-5 bg-green-500 align-middle" />Route set through a control point</span>
      <span><i class="mr-2 inline-block h-[5px] w-5 bg-neutral-600 align-middle" />Idle</span>
      <span>Switch <b class="text-neutral-50">N</b> normal, <b class="text-amber-500">R</b> reverse, gap on the leg it isn't lined for</span>
      <span v-if="controllable">Click a signal or a switch to work it</span>
      <span>Hover anything for the game's id</span>
    </div>
  </div>
</template>
