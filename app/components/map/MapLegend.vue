<script setup lang="ts">
// What each symbol and track color on the map means.
defineProps<{ layers: MapLayers; speeds: number[] }>()
const palette = useMapPalette()

const SYMBOLS: { symbol: MapSymbol; label: string }[] = [
  { symbol: 'place', label: 'Town or area' },
  { symbol: 'industry', label: 'Industry' },
  { symbol: 'stop', label: 'Passenger stop' },
  { symbol: 'switchOpen', label: 'Switch open, lined straight (zoom in)' },
  { symbol: 'switchClosed', label: 'Switch closed, thrown to the diverging route' },
  { symbol: 'switch', label: 'Switch, position not reported' },
  { symbol: 'turntable', label: 'Turntable' }
]

const TRAIN_SYMBOLS: { symbol: MapSymbol; label: string }[] = [
  { symbol: 'trainMoving', label: 'Train moving, pointing the way it goes' },
  { symbol: 'trainStopped', label: 'Train stopped' }
]
</script>

<template>
  <Card>
    <CardHeader><CardTitle class="text-base">Map key</CardTitle></CardHeader>
    <CardContent class="grid gap-4 text-sm">
      <ul class="grid gap-1.5">
        <li v-for="item in SYMBOLS" :key="item.symbol" class="flex items-center gap-2">
          <MapSymbolIcon :symbol="item.symbol" />
          {{ item.label }}
        </li>
      </ul>

      <ul v-if="layers.trains" class="grid gap-1.5">
        <li v-for="item in TRAIN_SYMBOLS" :key="item.symbol" class="flex items-center gap-2">
          <MapSymbolIcon :symbol="item.symbol" />
          {{ item.label }}
        </li>
      </ul>

      <div class="grid gap-1.5">
        <p class="text-xs font-medium text-muted-foreground">{{ layers.speed ? 'Track speed limit' : 'Track' }}</p>
        <template v-if="layers.speed">
          <div v-for="limit in speeds" :key="limit" class="flex items-center gap-2">
            <span class="mx-0.5 h-1 w-5 rounded-full" :style="{ background: speedColor(palette, limit) }" />
            {{ limit ? `${limit} mph` : 'None set in the map data' }}
          </div>
        </template>
        <div v-else class="flex items-center gap-2">
          <span class="mx-0.5 h-1 w-5 rounded-full" :style="{ background: palette.track }" />
          Track
        </div>
      </div>
    </CardContent>
  </Card>
</template>
