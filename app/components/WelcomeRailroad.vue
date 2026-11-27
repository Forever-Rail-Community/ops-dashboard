<script setup lang="ts">
// The welcome's look at the railroad right now (WelcomeOverlay.vue): whether Railroader is running and how many trains
// are out, from the live data the map uses. With `line` (the person can view the CTC board), the first line too, as a
// strip with each train where it is, by the same layout the CTC board draws.
const props = defineProps<{ line: boolean }>()

const { live, response } = useLiveMap(ref(null))
const { lines } = props.line ? useCtcLines() : { lines: ref<CtcLine[] | null>(null) }

const online = computed(() => response.value?.trainsAge.ageSec != null && !response.value.trainsAge.stale)
const count = computed(() => live.value.trains.length)
const board = computed(() => {
  const l = lines.value?.[0]
  const layout = live.value.signals.layout
  return l && layout?.controlPoints.length ? { line: l, layout, board: boardLayout(l, layout) } : null
})
// Up to five towns, evenly spread, so their names don't crowd.
const towns = computed(() => {
  const all = board.value?.board.towns ?? []
  if (all.length <= 5) return all
  return [0, 1, 2, 3, 4].map((k) => all[Math.round((k * (all.length - 1)) / 4)]!)
})
const trains = computed(() => (board.value ? boardTrains(board.value.board, board.value.layout, live.value.signals.aspects, live.value.trains) : []))
const at = (x: number) => 14 + (x / (board.value?.board.width || 1)) * 292
</script>

<template>
  <div class="railroad">
    <div class="head">
      <span class="state"><i :class="online ? 'on' : 'off'" />{{ online ? 'Railroader is running' : 'Railroader is offline right now' }}</span>
      <span v-if="online">{{ count ? `${count} ${count === 1 ? 'train' : 'trains'}${board ? ` on the ${board.line.name}` : ''}` : 'The railroad is quiet right now' }}</span>
    </div>
    <svg v-if="board" viewBox="0 0 320 48" :aria-label="`The ${board.line.name}, with ${trains.length} trains on it`" role="img">
      <line class="rail" x1="14" y1="22" x2="306" y2="22" />
      <g v-for="(t, k) in towns" :key="t.name" class="town">
        <line :x1="at(t.x)" y1="17" :x2="at(t.x)" y2="27" />
        <text :x="at(t.x)" y="42" :text-anchor="k === 0 ? 'start' : k === towns.length - 1 ? 'end' : 'middle'">{{ t.name }}</text>
      </g>
      <g v-for="t in trains" :key="t.id" :transform="`translate(${at(t.x)} 22)`">
        <g class="train" :data-dir="t.speedMph >= 1 ? (t.right ? 1 : -1) : 0"><circle r="7" class="halo" /><circle r="3.5" /></g>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.railroad { width: 100%; padding: 10px 12px 6px; border-radius: 14px; background: rgb(255 255 255 / 0.045); border: 1px solid rgb(255 255 255 / 0.09); }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; align-items: center; padding-bottom: 4px; font-size: 12px; color: rgb(255 255 255 / 0.62); }
.state { display: inline-flex; align-items: center; gap: 7px; color: #fff; font-weight: 500; }
.state i { position: relative; width: 7px; height: 7px; border-radius: 50%; }
.state i.on { background: #4ade80; }
.state i.off { background: #a3a3a3; }
.state i.on::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #4ade80; animation: ping 1.6s ease-out infinite; }
@keyframes ping { to { transform: scale(2.6); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .state i.on::after { animation: none; } }
svg { display: block; width: 100%; overflow: visible; }
.rail, .town line { stroke: rgb(255 255 255 / 0.28); stroke-linecap: round; }
.rail { stroke-width: 2; }
.town line { stroke-width: 1.5; }
.town text { fill: rgb(255 255 255 / 0.5); font-size: 8.5px; }
.train circle { fill: #fbbf24; }
.train .halo { fill: rgb(251 191 36 / 0.25); transform-box: fill-box; transform-origin: center; }
</style>
