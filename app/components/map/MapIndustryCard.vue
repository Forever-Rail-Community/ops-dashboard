<script setup lang="ts">
import { ChevronLeft, Eye, EyeOff, LocateFixed } from '@lucide/vue'

// An industry's card: what it does, its highlighted track, trains and cars on its track, passengers waiting at a
// stop, the nearest trains, and the town's other industries.
const props = defineProps<{ map: MapData; industry: MapIndustry; live: LiveMapData; trackShown: boolean }>()
const emit = defineEmits<{
  back: [area: MapArea]
  zoom: []
  showTrack: [on: boolean]
  openIndustry: [industry: MapIndustry]
  pickTrain: [train: LiveTrain]
}>()

const NEAREST = 2
const OTHERS_SHOWN = 3

const palette = useMapPalette()
const { areaById, industryById, industriesIn } = useMapIndex(props.map)

const area = computed(() => areaById.get(props.industry.area))
const type = computed(() => industryType(props.industry))
// Its main type first, then the rest.
const kinds = computed(() => [...props.industry.kinds].sort((a, b) => Number(b === type.value) - Number(a === type.value)))

const onTrack = computed(() => trainsAtIndustry(props.map, props.industry, props.live.trains))
const nearest = computed(() =>
  props.live.trains
    .filter((t) => !onTrack.value.includes(t))
    .map((train) => ({ train, meters: Math.hypot(train.x - props.industry.x, train.z - props.industry.z) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, NEAREST)
)
const others = computed(() => industriesIn(props.industry.area).filter((i) => i.id !== props.industry.id))

// Names for the game's ids in cars' waybills ("al-engine.coaling") and passengers' destinations ("bryson").
const industryName = (id: string) => industryById.get(id.split('.')[0]!)?.name ?? id
const stopName = (stopId: string) => {
  const entry = Object.entries(props.live.industries.passengers).find(([, p]) => p.stop === stopId)
  return entry ? industryName(entry[0]) : stopId
}

const cars = computed(() =>
  (props.live.industries.cars[props.industry.id] ?? []).map((car) => ({
    ...car,
    load: car.loads.map((l) => `${l.name} ${l.quantity}`).join(', ') || 'Empty',
    billed: car.waybill ? `${car.waybill.completed ? 'Delivered to' : 'Billed to'} ${industryName(car.waybill.destination)}` : 'No waybill'
  }))
)
const waiting = computed(() => {
  const stop = props.live.industries.passengers[props.industry.id]
  return stop ? Object.entries(stop.waiting).map(([to, count]) => ({ to: stopName(to), count })).sort((a, b) => b.count - a.count) : []
})
const isStop = computed(() => isPassengerStop(props.industry))
const { distance } = useUnits()
</script>

<template>
  <Card class="gap-4">
    <CardHeader class="grid gap-3">
      <Button v-if="area" variant="ghost" size="sm" class="-ml-2 h-7 justify-self-start px-2 text-muted-foreground" @click="emit('back', area)">
        <ChevronLeft />{{ area.name }}
      </Button>
      <div class="flex items-center gap-2">
        <MapIndustryIcon :industry="industry" />
        <CardTitle class="text-base">{{ industry.name }}</CardTitle>
      </div>
      <div v-if="kinds.length" class="flex flex-wrap gap-1.5">
        <span v-for="kind in kinds" :key="kind" class="rounded-full px-2 py-0.5 text-xs font-medium" :style="industryTagStyle(palette, kind)">{{ KIND_TEXT[kind] }}</span>
      </div>
    </CardHeader>

    <CardContent class="grid gap-4 text-sm">
      <section class="grid gap-2 rounded-lg border p-3" :style="trackShown ? { borderColor: palette.industry[type] } : {}">
        <p v-if="!industry.track.length" class="text-muted-foreground">The map data doesn't list track for this industry.</p>
        <template v-else>
          <p class="flex items-center gap-2 font-medium">
            <span class="h-1.5 w-5 shrink-0 rounded-full" :style="{ background: palette.industry[type], opacity: trackShown ? 1 : 0.35 }" />
            {{ trackShown ? 'Its track is highlighted on the map' : 'Its track is not highlighted' }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ industry.track.length }} {{ industry.track.length === 1 ? 'piece' : 'pieces' }} of track, from the map data. Cars spotted here stand on this track.
          </p>
        </template>
        <div class="flex gap-1.5">
          <Button size="sm" class="h-7 text-xs" @click="emit('zoom')"><LocateFixed />Zoom to it</Button>
          <Button v-if="industry.track.length" size="sm" variant="outline" class="h-7 text-xs" @click="emit('showTrack', !trackShown)">
            <component :is="trackShown ? EyeOff : Eye" />{{ trackShown ? 'Hide its track' : 'Show its track' }}
          </Button>
        </div>
      </section>

      <section class="grid gap-1" aria-labelledby="industry-trains">
        <h3 id="industry-trains" class="text-xs font-medium text-muted-foreground">On its track now</h3>
        <MapTrainRow v-for="train in onTrack" :key="train.id" :map="map" :train="train" @pick="emit('pickTrain', train)" />
        <p v-if="!onTrack.length" class="rounded-lg border border-dashed px-3 py-2 text-muted-foreground">No trains on its track right now.</p>
      </section>

      <section class="grid gap-1" aria-labelledby="industry-cars">
        <h3 id="industry-cars" class="text-xs font-medium text-muted-foreground">Cars here</h3>
        <p v-if="!live.industriesReported" class="text-xs text-muted-foreground">
          Cars show here once the Railroader game server runs tracker pack 0.3 or newer.
        </p>
        <p v-else-if="!cars.length" class="rounded-lg border border-dashed px-3 py-2 text-muted-foreground">No cars on its track.</p>
        <ul v-else class="grid gap-1" :class="{ 'opacity-60': live.industriesStale }">
          <li v-for="car in cars" :key="car.id" class="grid gap-0.5 rounded-lg px-2 py-1.5">
            <span class="flex justify-between gap-3"><span class="font-medium">{{ car.name }}</span><span class="text-xs text-muted-foreground">{{ car.type }}</span></span>
            <span class="text-xs text-muted-foreground">{{ car.load }}. {{ car.billed }}.</span>
          </li>
        </ul>
      </section>

      <section v-if="isStop && live.industriesReported" class="grid gap-1" aria-labelledby="industry-passengers">
        <h3 id="industry-passengers" class="text-xs font-medium text-muted-foreground">Passengers waiting</h3>
        <p v-if="!waiting.length" class="text-muted-foreground">Nobody is waiting here.</p>
        <ul v-else class="grid gap-0.5">
          <li v-for="w in waiting" :key="w.to" class="flex justify-between px-2 py-1"><span>To {{ w.to }}</span><span class="tabular-nums">{{ w.count }}</span></li>
        </ul>
      </section>

      <section v-if="nearest.length" class="grid gap-1" aria-labelledby="industry-nearest">
        <h3 id="industry-nearest" class="text-xs font-medium text-muted-foreground">Nearest trains</h3>
        <MapTrainRow
          v-for="n in nearest"
          :key="n.train.id"
          :map="map"
          :train="n.train"
          :detail="`${distance(n.meters)} away, ${trainWhere(map, n.train).toLowerCase()}`"
          @pick="emit('pickTrain', n.train)"
        />
      </section>

      <section v-if="others.length && area" class="grid gap-1.5 border-t pt-4" aria-labelledby="industry-others">
        <h3 id="industry-others" class="text-xs font-medium text-muted-foreground">Also in {{ area.name }}</h3>
        <div class="flex flex-wrap gap-1.5">
          <Button v-for="other in others.slice(0, OTHERS_SHOWN)" :key="other.id" size="sm" variant="outline" class="h-7 gap-1.5 rounded-full px-3 text-xs" @click="emit('openIndustry', other)">
            <span class="size-2 shrink-0" :class="isPassengerStop(other) ? 'rotate-45' : ''" :style="{ background: palette.industry[industryType(other)] }" />
            {{ other.name }}
          </Button>
          <Button v-if="others.length > OTHERS_SHOWN" size="sm" variant="ghost" class="h-7 px-2 text-xs text-muted-foreground" @click="emit('back', area)">
            {{ others.length - OTHERS_SHOWN }} more
          </Button>
        </div>
      </section>
    </CardContent>
  </Card>
</template>
