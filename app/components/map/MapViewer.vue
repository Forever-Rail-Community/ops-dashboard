<script setup lang="ts">
import { Maximize, Minus, Plus } from '@lucide/vue'

// `live` is what moves while the map is open (trains). The railroad itself comes from `map`.
// `rememberAs` names where the map's position is saved in the browser, so it reopens where it was left.
const props = withDefaults(defineProps<{ map: MapData; live?: LiveMapData; rememberAs?: string }>(), {
  live: () => ({ trains: [], stale: false, switches: {}, switchesStale: false, switchLegs: {}, industries: { cars: {}, passengers: {} }, industriesStale: false, industriesReported: false, signals: { layout: null, aspects: {}, occupied: {}, stale: false } }),
  rememberAs: undefined
})

const layers = ref<MapLayers>({ ...DEFAULT_LAYERS })
const { units, speed } = useUnits()
const selected = ref<MapHit | null>(null)
const hovered = ref<(MapHit & { sx: number; sy: number }) | null>(null)

// ---- What the side card shows, and which industry's track is highlighted ----
const { areaById, industryById } = useMapIndex(props.map)
const selectedArea = computed(() => (selected.value?.type === 'place' ? areaById.get(selected.value.id) : undefined))
const selectedIndustry = computed(() => (selected.value?.type === 'industry' ? industryById.get(selected.value.id) : undefined))
// Selecting an industry highlights its track; a town card highlights the industry opened in it.
const highlightId = ref<string | null>(null)
watch(selected, (hit) => (highlightId.value = hit?.type === 'industry' ? hit.id : null))
const highlight = computed(() => (highlightId.value ? industryById.get(highlightId.value) ?? null : null))

const wrap = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
let dpr = 1

const camera = useMapView(props.map.bounds, props.rememberAs)
const { view } = camera

// ---- Following a train: the map keeps it centered at each update, until the map is dragged or another thing is picked ----
const following = ref<string | null>(null)
watch(
  () => props.live.trains,
  (trains) => {
    const train = following.value ? trains.find((t) => t.id === following.value) : undefined
    if (train) camera.centerOn(train.x, train.z)
  }
)
watch(selected, (hit) => {
  if (hit?.id !== following.value) following.value = null
})
function setFollowing(on: boolean) {
  const hit = selected.value
  following.value = on && hit?.type === 'train' ? hit.id : null
  const train = props.live.trains.find((t) => t.id === following.value)
  if (train) camera.centerOn(train.x, train.z)
}
// Moving the map by hand stops following.
const pointerCamera = {
  ...camera,
  panBy: (dx: number, dy: number) => {
    following.value = null
    camera.panBy(dx, dy)
  }
}
const palette = useMapPalette()
const speeds = computed(() => speedLimitsIn(props.map))

// Keep the hover label inside the map when the pointer is near the right edge.
const hoverStyle = computed(() => {
  const h = hovered.value
  if (!h) return {}
  return h.sx > view.w - 220 ? { right: `${view.w - h.sx + 14}px`, top: `${h.sy + 14}px` } : { left: `${h.sx + 14}px`, top: `${h.sy + 14}px` }
})

const pointer = useMapPointer(canvas, pointerCamera, {
  hitAt: (x, y) => {
    const ctx = canvas.value?.getContext('2d')
    return ctx ? hitAt(x, y, props.map, view, layers.value, props.live, ctx, units.value) : null
  },
  onHover: (hit) => (hovered.value = hit),
  onSelect: (hit) => (selected.value = hit)
})

// ---- Drawing: redraw (at most once per frame) whenever the camera, layers or selection change ----
// The real-world map is only offered when the server has a tile key; its tiles redraw the map as they arrive.
const backgroundAvailable = useRuntimeConfig().public.mapBackground
const tiles = backgroundAvailable ? new TileCache(() => redraw()) : null
let queued = false
function redraw() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    const ctx = canvas.value?.getContext('2d')
    if (!ctx || !view.w) return
    drawMap(ctx, { map: props.map, view, layers: layers.value, selected: selected.value, highlight: highlight.value, live: props.live, palette: palette.value, tiles, units: units.value }, dpr)
  })
}
watch([view, layers, selected, highlight, palette, units, () => props.live], redraw, { deep: true })

// ---- Size: keep the canvas sharp on high-density screens ----
function fitCanvasToBox() {
  const box = wrap.value!.getBoundingClientRect()
  const el = canvas.value!
  dpr = window.devicePixelRatio || 1
  el.width = Math.round(box.width * dpr)
  el.height = Math.round(box.height * dpr)
  el.style.width = `${box.width}px`
  el.style.height = `${box.height}px`
  camera.resize(Math.max(1, Math.round(box.width)), Math.max(1, Math.round(box.height)))
  redraw()
}

let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(fitCanvasToBox)
  observer.observe(wrap.value!)
  fitCanvasToBox()
})
onBeforeUnmount(() => observer?.disconnect())

// ---- Jump to a search result, a place, an industry or a train in the lists ----
const pickTrain = (train: LiveTrain) => focusOn(trainHit(train))
const openIndustry = (industry: MapIndustry) => focusOn(industryHit(industry))
// Frames the industry's own track, with room around it.
function zoomToIndustry(industry: MapIndustry) {
  const { x, z, meters } = industryFrame(props.map, industry)
  camera.flyTo(x, z, Math.min(view.w, view.h) / (meters * 2))
}

function focusOn(hit: MapHit) {
  selected.value = hit
  const industry = hit.type === 'industry' ? industryById.get(hit.id) : undefined
  if (industry) return zoomToIndustry(industry)
  // Towns are framed by their size, industries by their track, trains close enough to see the tracks around them.
  const radius = hit.type === 'place' ? areaById.get(hit.id)?.r : undefined
  const scale = radius
    ? Math.max(view.fit * 4, Math.min(view.w, view.h) / (radius * 2.4))
    : Math.max(view.s, view.fit * (hit.type === 'train' ? 40 : 12))
  camera.flyTo(hit.x, hit.z, scale)
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[1fr_340px]">
    <div class="flex min-w-0 flex-col gap-3">
      <MapSearch :map="map" @pick="focusOn" />

      <div ref="wrap" class="relative h-[60vh] min-h-[360px] overflow-hidden rounded-xl border bg-card sm:min-h-[440px] lg:h-[calc(100svh-14rem)]">
        <canvas
          ref="canvas"
          class="block cursor-grab touch-none active:cursor-grabbing"
          tabindex="0"
          role="img"
          aria-label="Map of the railroad. Drag to move, scroll to zoom. The list of places beside the map can also be used to jump somewhere."
          @pointerdown="pointer.onDown"
          @pointermove="pointer.onMove"
          @pointerup="pointer.onUp"
          @pointercancel="pointer.onUp"
          @pointerleave="pointer.onLeave"
          @wheel.prevent="pointer.onWheel"
          @dblclick="pointer.onDoubleClick"
          @keydown="pointer.onKey"
        />

        <div
          v-if="hovered"
          class="pointer-events-none absolute z-10 max-w-56 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          :style="hoverStyle"
        >
          <div class="font-medium">{{ hovered.name }}</div>
          <div v-if="hovered.type === 'track'" class="text-muted-foreground">
            {{ hovered.speed ? `Speed limit ${speed(hovered.speed)}` : 'No speed limit set' }}
          </div>
          <div v-else-if="hovered.type === 'train'" class="text-muted-foreground">{{ trainMotion(hovered.speed ?? 0, units) }}</div>
          <div v-else-if="hovered.type === 'switch'" class="text-muted-foreground">{{ switchText(live.switches[hovered.id]) }}</div>
          <div v-else-if="hovered.type === 'signal'" class="text-muted-foreground">{{ ASPECT_TEXT[live.signals.aspects[hovered.id] ?? 'unknown'] }}</div>
        </div>

        <!-- The tile provider's terms require this credit to stay visible whenever their map is shown. -->
        <p v-if="tiles && layers.background" class="absolute bottom-0 left-0 rounded-tr-md bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
          © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" class="underline">OpenStreetMap</a> contributors
          © <a href="https://carto.com/attributions" target="_blank" rel="noopener" class="underline">CARTO</a>
        </p>

        <div class="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <Button size="icon" variant="outline" aria-label="Zoom in" @click="camera.zoomCenter(1.6)"><Plus /></Button>
          <Button size="icon" variant="outline" aria-label="Zoom out" @click="camera.zoomCenter(1 / 1.6)"><Minus /></Button>
          <Button size="icon" variant="outline" aria-label="Show the whole railroad" @click="camera.reset"><Maximize /></Button>
        </div>
      </div>
    </div>

    <div class="flex min-w-0 flex-col gap-4">
      <MapTownCard
        v-if="selectedArea"
        :map="map"
        :area="selectedArea"
        :live="live"
        :highlight-id="highlightId"
        @highlight="highlightId = $event"
        @open-industry="openIndustry"
        @pick-train="pickTrain"
        @zoom-town="focusOn(placeHit(selectedArea))"
      />
      <MapIndustryCard
        v-else-if="selectedIndustry"
        :map="map"
        :industry="selectedIndustry"
        :live="live"
        :track-shown="highlightId === selectedIndustry.id"
        @back="focusOn(placeHit($event))"
        @zoom="zoomToIndustry(selectedIndustry)"
        @show-track="highlightId = $event ? selectedIndustry.id : null"
        @open-industry="openIndustry"
        @pick-train="pickTrain"
      />
      <MapInfoCard v-else-if="selected" :map="map" :hit="selected" :live="live" :following="following === selected.id" @follow="setFollowing" />
      <Card class="gap-0 p-3">
        <Tabs default-value="trains">
          <TabsList class="w-full">
            <TabsTrigger value="trains">Trains ({{ live.trains.length }})</TabsTrigger>
            <TabsTrigger value="key">Map key</TabsTrigger>
            <TabsTrigger value="places">Places</TabsTrigger>
          </TabsList>
          <TabsContent value="trains" class="max-h-[60vh] overflow-auto pt-2">
            <MapTrainList :map="map" :trains="live.trains" :stale="live.stale" :selected-id="selected?.type === 'train' ? selected.id : undefined" @pick="pickTrain" />
          </TabsContent>
          <TabsContent value="key" class="px-1 pt-3"><MapKey v-model="layers" :speeds="speeds" :background-available="backgroundAvailable" /></TabsContent>
          <TabsContent value="places" class="max-h-[60vh] overflow-auto pt-2"><MapPlaceList :map="map" @pick="focusOn" /></TabsContent>
        </Tabs>
      </Card>
    </div>
  </div>
</template>
