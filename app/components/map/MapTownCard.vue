<script setup lang="ts">
import { LocateFixed } from '@lucide/vue'

// A town's card: trains in town now, then its industries in track order, filterable by what they do.
// Picking an industry opens it in place and highlights its track on the map.
const props = defineProps<{ map: MapData; area: MapArea; live: LiveMapData; highlightId: string | null }>()
const emit = defineEmits<{
  highlight: [industryId: string | null]
  openIndustry: [industry: MapIndustry]
  pickTrain: [train: LiveTrain]
  zoomTown: []
}>()

const palette = useMapPalette()
const filter = ref<IndustryType | 'all'>('all')
watch(() => props.area.id, () => (filter.value = 'all'))

const order = computed(() => townOrder(props.map, props.area))
const industries = computed(() => order.value.stops.map((s) => s.industry))
const trains = computed(() => trainsInTown(props.map, props.area, props.live.trains))

// What an industry does, for the filter: any of its kinds counts, not only its main type.
const does = (industry: MapIndustry, type: IndustryType) =>
  type === 'other' ? industry.kinds.length === 0 : industry.kinds.includes(type as IndustryKind)

const chips = computed(() =>
  INDUSTRY_TYPES.map((type) => ({ type, count: industries.value.filter((i) => does(i, type)).length })).filter((c) => c.count)
)

const rows = computed(() =>
  order.value.stops
    .filter(({ industry }) => filter.value === 'all' || does(industry, filter.value))
    .map(({ industry, distance }) => {
      const type = industryType(industry)
      return {
        industry,
        type,
        distance: distance === null ? '' : formatMeters(distance),
        open: industry.id === props.highlightId,
        also: industryAlso(industry),
        trains: trainsAtIndustry(props.map, industry, props.live.trains),
        cars: props.live.industries.cars[industry.id]?.length ?? 0
      }
    })
)

const summary = computed(() => {
  const n = industries.value.length
  const t = trains.value.length
  return `${n} ${n === 1 ? 'industry' : 'industries'}, ${t ? `${t} ${t === 1 ? 'train' : 'trains'} here now` : 'no trains here now'}`
})

const toggle = (industry: MapIndustry) => emit('highlight', industry.id === props.highlightId ? null : industry.id)
</script>

<template>
  <Card class="gap-4">
    <CardHeader class="flex flex-row items-start justify-between gap-3">
      <div class="grid gap-1">
        <CardTitle class="text-base">{{ area.name }}</CardTitle>
        <CardDescription>{{ summary }}</CardDescription>
      </div>
      <Button size="sm" variant="outline" @click="emit('zoomTown')"><LocateFixed />Zoom to town</Button>
    </CardHeader>

    <CardContent class="grid gap-4">
      <section v-if="trains.length" class="grid gap-1" aria-labelledby="town-trains">
        <h3 id="town-trains" class="text-xs font-medium text-muted-foreground">Trains here now</h3>
        <MapTrainRow v-for="train in trains" :key="train.id" :map="map" :train="train" @pick="emit('pickTrain', train)" />
      </section>

      <div v-if="chips.length > 1" role="group" aria-label="Show industries that" class="flex flex-wrap gap-1.5">
        <Button size="sm" class="h-7 rounded-full px-3 text-xs" :variant="filter === 'all' ? 'default' : 'outline'" :aria-pressed="filter === 'all'" @click="filter = 'all'">
          All {{ industries.length }}
        </Button>
        <Button
          v-for="chip in chips"
          :key="chip.type"
          size="sm"
          class="h-7 gap-1.5 rounded-full px-3 text-xs"
          :variant="filter === chip.type ? 'default' : 'outline'"
          :aria-pressed="filter === chip.type"
          @click="filter = filter === chip.type ? 'all' : chip.type"
        >
          <span class="size-2 shrink-0" :class="chip.type === 'passenger' ? 'rotate-45' : ''" :style="{ background: palette.industry[chip.type] }" />
          {{ INDUSTRY_TYPE_TEXT[chip.type].short }} {{ chip.count }}
        </Button>
      </div>

      <ul class="grid gap-0.5">
        <li v-for="row in rows" :key="row.industry.id" class="rounded-lg" :class="row.open ? 'bg-accent' : ''">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
            :aria-expanded="row.open"
            @click="toggle(row.industry)"
          >
            <MapIndustryIcon :industry="row.industry" />
            <span class="min-w-0 flex-1" :class="row.open ? 'font-medium' : ''">{{ row.industry.name }}</span>
            <span v-if="row.distance" class="shrink-0 text-xs tabular-nums text-muted-foreground">{{ row.distance }}</span>
            <span class="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium" :style="industryTagStyle(palette, row.type)">
              {{ INDUSTRY_TYPE_TEXT[row.type].short }}
            </span>
          </button>

          <div v-if="row.open" class="grid gap-2.5 pb-3 pl-10 pr-2 text-xs">
            <p class="text-muted-foreground">
              {{ KIND_TEXT[row.type as IndustryKind] ?? 'Industry' }}{{ row.also ? `. ${row.also}` : '' }}.
              <template v-if="row.industry.track.length">Its track is highlighted on the map.</template>
            </p>
            <p v-for="train in row.trains" :key="train.id" class="font-medium" :style="{ color: palette.train }">
              {{ train.name }} is on its track, {{ isMoving(train) ? `moving at ${Math.round(train.speedMph)} mph` : 'stopped' }}
            </p>
            <p v-if="row.cars" class="text-muted-foreground">{{ row.cars }} {{ row.cars === 1 ? 'car' : 'cars' }} on its track</p>
            <div class="flex gap-1.5">
              <Button size="sm" class="h-7 text-xs" @click="emit('openIndustry', row.industry)">Zoom to it</Button>
              <Button size="sm" variant="outline" class="h-7 text-xs" @click="emit('highlight', null)">Hide its track</Button>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="order.from && rows.some((r) => r.distance)" class="text-xs text-muted-foreground">
        In track order from the {{ order.from }} end. Distances are along the track, roughly.
      </p>
    </CardContent>
  </Card>
</template>
