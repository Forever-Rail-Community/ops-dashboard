<script setup lang="ts">
import { Maximize, Minus, Plus } from '@lucide/vue'

const props = defineProps<{ map: MapData }>()

const layers = ref<MapLayers>({ ...DEFAULT_LAYERS })
const selected = ref<MapHit | null>(null)
const hovered = ref<(MapHit & { sx: number; sy: number }) | null>(null)

const wrap = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
let dpr = 1

const camera = useMapView(props.map.bounds)
const { view } = camera
const { areaById } = useMapIndex(props.map)
const palette = useMapPalette()
const speeds = computed(() => speedLimitsIn(props.map))

// Keep the hover label inside the map when the pointer is near the right edge.
const hoverStyle = computed(() => {
  const h = hovered.value
  if (!h) return {}
  return h.sx > view.w - 220 ? { right: `${view.w - h.sx + 14}px`, top: `${h.sy + 14}px` } : { left: `${h.sx + 14}px`, top: `${h.sy + 14}px` }
})

const pointer = useMapPointer(canvas, camera, {
  hitAt: (x, y) => hitAt(x, y, props.map, view, layers.value),
  onHover: (hit) => (hovered.value = hit),
  onSelect: (hit) => (selected.value = hit)
})

// ---- Drawing: redraw (at most once per frame) whenever the camera, layers or selection change ----
let queued = false
function redraw() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => {
    queued = false
    const ctx = canvas.value?.getContext('2d')
    if (ctx && view.w) drawMap(ctx, props.map, view, layers.value, selected.value, palette.value, dpr)
  })
}
watch([view, layers, selected, palette], redraw, { deep: true })

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

// ---- Jump to a search result or a place in the list ----
function focusOn(hit: MapHit) {
  selected.value = hit
  const radius = hit.type === 'place' ? areaById.get(hit.id)?.r : undefined
  const scale = radius
    ? Math.max(view.fit * 4, Math.min(view.w, view.h) / (radius * 2.4))
    : view.fit * 12
  camera.flyTo(hit.x, hit.z, scale)
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[1fr_300px]">
    <div class="flex min-w-0 flex-col gap-3">
      <MapSearch :map="map" @pick="focusOn" />

      <div ref="wrap" class="relative h-[55vh] min-h-[360px] sm:h-[62vh] sm:min-h-[420px] overflow-hidden rounded-xl border bg-card">
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
            {{ hovered.speed ? `Speed limit ${hovered.speed} mph` : 'No speed limit set' }}
          </div>
        </div>

        <div class="absolute bottom-3 right-3 flex flex-col gap-1.5">
          <Button size="icon" variant="outline" aria-label="Zoom in" @click="camera.zoomCenter(1.6)"><Plus /></Button>
          <Button size="icon" variant="outline" aria-label="Zoom out" @click="camera.zoomCenter(1 / 1.6)"><Minus /></Button>
          <Button size="icon" variant="outline" aria-label="Show the whole railroad" @click="camera.reset"><Maximize /></Button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <MapInfoCard v-if="selected" :map="map" :hit="selected" />
      <MapLayerPanel v-model="layers" :speeds="speeds" />
      <MapPlaceList :map="map" @pick="focusOn" />
    </div>
  </div>
</template>
