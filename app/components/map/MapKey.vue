<script setup lang="ts">
// The map key and the layer switches in one: each row turns a layer on or off, and shows what its symbols mean.
const props = defineProps<{ speeds: number[]; backgroundAvailable: boolean }>()
const layers = defineModel<MapLayers>({ required: true })
const palette = useMapPalette()

const setLayer = (key: keyof MapLayers, on: boolean | 'indeterminate') => {
  layers.value = { ...layers.value, [key]: on === true }
}

const unavailable = (layer: keyof MapLayers) => layer === 'background' && !props.backgroundAvailable

// With speed colors off, track is one color.
const trackItems = computed(() =>
  layers.value.speed
    ? props.speeds.map((limit) => ({ color: speedColor(palette.value, limit), label: limit ? `${limit} mph` : 'No limit in the map data' }))
    : [{ color: palette.value.track, label: 'Track' }]
)
</script>

<template>
  <div class="grid gap-3 text-sm">
    <div v-for="row in MAP_KEY" :key="row.layer" class="grid gap-1.5">
      <label class="flex items-center gap-2.5 font-medium" :class="{ 'opacity-50': unavailable(row.layer) }">
        <Checkbox :model-value="layers[row.layer]" :disabled="unavailable(row.layer)" @update:model-value="setLayer(row.layer, $event)" />
        <span class="flex-1">{{ row.label }}</span>
        <MapSymbolIcon v-if="row.symbol" :symbol="row.symbol" :class="{ 'opacity-40': !layers[row.layer] }" />
      </label>

      <ul v-if="row.items" class="grid gap-1 pl-6.5 text-muted-foreground" :class="{ 'opacity-50': !layers[row.layer] }">
        <li v-for="item in row.items" :key="item.label" class="flex items-center gap-2">
          <MapSymbolIcon :symbol="item.symbol" :fill="item.industryType && palette.industry[item.industryType]" />
          {{ item.label }}
        </li>
      </ul>

      <ul v-if="row.layer === 'speed'" class="grid gap-1 pl-6.5 text-muted-foreground">
        <li v-for="item in trackItems" :key="item.label" class="flex h-6 items-center gap-2">
          <span class="mx-0.5 h-1 w-5 shrink-0 rounded-full" :style="{ background: item.color }" />
          {{ item.label }}
        </li>
      </ul>

      <p v-if="row.layer === 'background'" class="pl-6.5 text-xs text-muted-foreground">
        {{ backgroundAvailable ? 'Lines up within about 50–170 m; closer in, the track can sit beside the real line.' : 'Not set up on this dashboard yet (needs a map tile key).' }}
      </p>
    </div>
  </div>
</template>
