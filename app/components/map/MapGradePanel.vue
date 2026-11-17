<script setup lang="ts">
import { ArrowDownRight, ArrowRight, ArrowUpRight } from '@lucide/vue'

// The grade under a train, the track profile where it has been (its recorded path) and ahead of it (following the
// switches as they're lined), and what's coming: the steepest climb and descent, the top, the next town.
const props = defineProps<{ map: MapData; live: LiveMapData; train: LiveTrain }>()

const palette = useMapPalette()
const { units, distance, height } = useUnits()
const history = useTrainHistory(toRef(props, 'train'))

// How far ahead to show, in the person's long unit; a quarter of that is shown behind.
const RANGES = [2, 5, 10]
const range = ref(2)
const unit = computed(() => routeUnit(units.value))

const profile = computed(() =>
  gradeProfile(props.map, props.live, props.train, history.value, range.value * unit.value.meters, (range.value / 4) * unit.value.meters)
)
const outlook = computed(() => (profile.value ? gradeOutlook(props.map, profile.value, props.train) : undefined))

// Below this the grade reads as level: the heights are rounded, so tiny grades are noise.
const LEVEL = 0.2
const headline = computed(() => {
  const grade = profile.value?.now.grade ?? 0
  if (Math.abs(grade) < LEVEL) return { text: 'Level', icon: ArrowRight, color: undefined }
  return grade > 0
    ? { text: `Climbing ${percent(grade)}`, icon: ArrowUpRight, color: palette.value.climbs[Math.max(1, gradeClass(grade))] }
    : { text: `Descending ${percent(grade)}`, icon: ArrowDownRight, color: palette.value.descents[Math.max(1, gradeClass(grade))] }
})
const percent = (grade: number) => `${Math.abs(grade).toFixed(1)}%`
const colorOf = (grade: number) => (grade >= 0 ? palette.value.climbs : palette.value.descents)[gradeClass(grade)]!

// ---- The chart: height along the track, the train at "now" ----
const W = 300
const H = 132
const PAD = { left: 38, right: 8, top: 18, bottom: 18 }

const chart = computed(() => {
  const p = profile.value
  const stretches = p ? [...p.behind, ...p.ahead] : []
  if (!p || !stretches.length) return undefined
  const from = Math.min(0, stretches[0]!.from)
  const to = Math.max(stretches.at(-1)!.to, 1)
  const heights = stretches.flatMap((s) => [s.fromHeight, s.toHeight])
  const low = Math.min(...heights)
  const high = Math.max(...heights)
  // At least 15 m tall, so a nearly flat stretch doesn't look dramatic.
  const span = Math.max(high - low, 15)
  const bottom = low - span * 0.15
  const top = bottom + span * 1.35
  const x = (m: number) => PAD.left + ((m - from) / (to - from)) * (W - PAD.left - PAD.right)
  const y = (h: number) => PAD.top + (1 - (h - bottom) / (top - bottom)) * (H - PAD.top - PAD.bottom)
  const base = H - PAD.bottom
  const area = (part: GradeStretch[]) =>
    part.length
      ? `M${x(part[0]!.from)},${base} ${part.map((s) => `L${x(s.from)},${y(s.fromHeight)} L${x(s.to)},${y(s.toHeight)}`).join(' ')} L${x(part.at(-1)!.to)},${base} Z`
      : ''

  const step = range.value <= 2 ? 0.5 : range.value <= 5 ? 1 : 2
  const ticks: { at: number; label: string }[] = []
  for (let n = Math.ceil(from / unit.value.meters / step) * step; n * unit.value.meters <= to + 1e-6; n += step) {
    ticks.push({ at: x(n * unit.value.meters), label: Math.abs(n) < 1e-9 ? 'now' : `${n < 0 ? '−' : ''}${Math.abs(n)}` })
  }
  const { climb, top: peak } = outlook.value ?? {}
  return {
    base,
    behindArea: area(p.behind),
    aheadArea: area(p.ahead),
    lines: stretches.map((s) => ({ d: `M${x(s.from)},${y(s.fromHeight)} L${x(s.to)},${y(s.toHeight)}`, color: colorOf(s.grade), behind: s.to <= 0 })),
    now: { x: x(0), y: y(p.now.height) },
    climb: climb && { x: x((climb.from + climb.to) / 2), y: y((climb.fromHeight + climb.toHeight) / 2) },
    peak: peak && { x: x(peak.at), y: y(peak.height) },
    labels: [
      { y: y(high), text: Math.round(heightValue(high, units.value)).toLocaleString('en-US') },
      { y: y(low), text: Math.round(heightValue(low, units.value)).toLocaleString('en-US') }
    ],
    hasBehind: p.behind.length > 0,
    ticks
  }
})

const rows = computed(() => {
  const o = outlook.value
  if (!o) return []
  return [
    o.climb && { label: 'Steepest climb', value: `${percent(o.climb.grade)} in ${distance(o.climb.from)}`, mark: true },
    o.descent && { label: 'Steepest descent', value: `${percent(o.descent.grade)} in ${distance(o.descent.from)}` },
    o.top && { label: 'Tops out', value: `${height(o.top.height)} in ${distance(o.top.at)}` },
    o.town && { label: 'Next town', value: `${o.town.name} in ${distance(o.town.at)}` },
    profile.value?.endsAhead && { label: 'Profile stops', value: profile.value.endsAhead }
  ].filter(Boolean) as { label: string; value: string; mark?: boolean }[]
})
</script>

<template>
  <section class="grid gap-3 border-t pt-3" aria-label="Grade">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-medium">Grade</h3>
      <div class="flex rounded-md border p-0.5" role="group" aria-label="How far ahead to show">
        <button
          v-for="n in RANGES"
          :key="n"
          type="button"
          class="rounded px-2 py-0.5 text-xs"
          :class="range === n ? 'bg-accent font-medium' : 'text-muted-foreground hover:text-foreground'"
          :aria-pressed="range === n"
          @click="range = n"
        >
          {{ n }} {{ unit.label }}
        </button>
      </div>
    </div>

    <p v-if="!profile" class="text-sm text-muted-foreground">Where this train is on the track isn't reported.</p>
    <template v-else>
      <div class="flex items-baseline justify-between gap-2">
        <p class="flex items-center gap-1.5 text-lg font-semibold" :style="{ color: headline.color }">
          <component :is="headline.icon" class="size-5" />{{ headline.text }}
        </p>
        <p class="text-xs text-muted-foreground">Elevation {{ height(profile.now.height) }}</p>
      </div>

      <svg v-if="chart" :viewBox="`0 0 ${W} ${H}`" class="w-full" role="img" :aria-label="`Track profile, ${range} ${unit.label} ahead`">
        <text v-for="l in chart.labels" :key="l.text" :x="PAD.left - 4" :y="l.y + 3" text-anchor="end" class="fill-muted-foreground text-[9px]">{{ l.text }}</text>
        <text :x="PAD.left - 4" y="10" text-anchor="end" class="fill-muted-foreground text-[9px]">{{ heightUnit(units) }}</text>
        <path :d="chart.behindArea" class="fill-muted opacity-50" />
        <path :d="chart.aheadArea" class="fill-muted" />
        <path v-for="(l, i) in chart.lines" :key="i" :d="l.d" :stroke="l.color" :opacity="l.behind ? 0.45 : 1" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <text v-if="chart.hasBehind" :x="PAD.left + 2" :y="PAD.top - 6" class="fill-muted-foreground text-[9px]">Where it's been</text>
        <line :x1="chart.now.x" :x2="chart.now.x" :y1="PAD.top - 4" :y2="chart.base" class="stroke-foreground" stroke-dasharray="2 2" stroke-width="1" />
        <circle :cx="chart.now.x" :cy="chart.now.y" r="4" class="fill-foreground stroke-background" stroke-width="2" />
        <g v-if="chart.peak">
          <path :d="`M${chart.peak.x - 4},${chart.peak.y - 7} L${chart.peak.x + 4},${chart.peak.y - 7} L${chart.peak.x},${chart.peak.y - 2} Z`" class="fill-foreground" />
          <text :x="Math.min(chart.peak.x, W - 14)" :y="chart.peak.y - 10" text-anchor="middle" class="fill-foreground text-[9px] font-medium">Top</text>
        </g>
        <circle v-if="chart.climb" :cx="chart.climb.x" :cy="chart.climb.y" r="3" :fill="palette.climbs[3]" />
        <line :x1="PAD.left" :x2="W - PAD.right" :y1="chart.base" :y2="chart.base" class="stroke-border" />
        <text v-for="t in chart.ticks" :key="t.label" :x="t.at" :y="H - 5" text-anchor="middle" class="fill-muted-foreground text-[9px]">{{ t.label }}</text>
      </svg>

      <dl v-if="rows.length" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <template v-for="row in rows" :key="row.label">
          <dt class="text-muted-foreground">{{ row.label }}</dt>
          <dd class="flex items-center gap-1.5 font-medium">
            <span v-if="row.mark" class="size-2 shrink-0 rounded-full" :style="{ background: palette.climbs[3] }" aria-hidden="true" />
            {{ row.value }}
          </dd>
        </template>
      </dl>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span class="flex items-center gap-1">Climbing <span v-for="i in 3" :key="i" class="h-1 w-3 rounded" :style="{ background: palette.climbs[i] }" /></span>
        <span class="flex items-center gap-1">Descending <span v-for="i in 3" :key="i" class="h-1 w-3 rounded" :style="{ background: palette.descents[i] }" /></span>
        <span>gentle → steep</span>
      </div>
    </template>
  </section>
</template>
