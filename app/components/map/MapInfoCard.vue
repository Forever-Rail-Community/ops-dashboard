<script setup lang="ts">
import { Crosshair } from '@lucide/vue'

const props = defineProps<{ map: MapData; hit: MapHit; live: LiveMapData; following: boolean }>()
const emit = defineEmits<{ follow: [on: boolean] }>()
const palette = useMapPalette()
const { units } = useUnits()

// A labeled detail; `color` adds a dot before the value (a signal's aspect).
interface Row {
  label: string
  value: string
  color?: string
}

// Title, subtitle, labeled details and a short list for a train, a signal, a switch or plain track. Towns and
// industries have their own cards.
// Read a train from the latest positions, so the card stays current while it moves.
const trainNow = computed(() => (props.hit.type === 'train' ? props.live.trains.find((t) => t.id === props.hit.id) : undefined))

const info = computed((): { title: string; sub: string; lines: string[]; rows?: Row[]; speed?: { mph: number; limit?: number } } => {
  const { hit } = props
  if (hit.type === 'train') {
    const train = trainNow.value
    if (!train) return { title: hit.name, sub: 'No longer reported by the game server', lines: [] }
    // The speed itself is shown with the limit below, so the subtitle only says moving or stopped.
    const motion = isMoving(train) ? 'Moving' : 'Stopped'
    const limit = trainSpeedLimit(props.map, train)
    return {
      title: train.name,
      sub: props.live.stale ? `Last known: ${motion.toLowerCase()}` : motion,
      speed: { mph: train.speedMph, limit },
      lines: [trainWhere(props.map, train), `${train.cars} ${train.cars === 1 ? 'car' : 'cars'}, locomotives included`]
    }
  }
  if (hit.type === 'signal') {
    // Like a signal's box on a dispatcher's map: what kind it is, what it shows, and which trains it governs.
    const signal = props.live.signals.layout?.signals.find((s) => s.id === hit.id)
    const aspect = props.live.signals.aspects[hit.id] ?? 'unknown'
    const stale = props.live.signals.stale
    const rows: Row[] = [
      { label: 'Type', value: signal ? signalKindText(signal).replace(/ signal$/, '') : 'Not reported' },
      { label: 'State', value: stale ? `${ASPECT_TEXT[aspect]} (last known)` : ASPECT_TEXT[aspect], color: palette.value.aspects[aspect] },
      { label: 'Faces', value: (signal && signalFacingText(signal)) || 'Not reported' }
    ]
    return { title: hit.name, sub: '', rows, lines: [] }
  }
  if (hit.type === 'switch') {
    const text = switchText(props.live.switches[hit.id])
    return { title: 'Switch', sub: props.live.switchesStale ? `Last known: ${text}` : text, lines: [] }
  }
  return {
    title: 'Track',
    sub: hit.speed ? `Posted speed limit: ${formatSpeed(hit.speed, units.value)}` : 'No speed limit set in the map data',
    lines: []
  }
})
</script>

<template>
  <!-- Without a subtitle (signals), the details sit closer under the title. -->
  <Card :class="{ 'gap-3': !info.sub }">
    <CardHeader :class="{ 'gap-0': !info.sub }">
      <CardTitle class="text-base">{{ info.title }}</CardTitle>
      <CardDescription v-if="info.sub">{{ info.sub }}</CardDescription>
    </CardHeader>
    <CardContent v-if="info.rows || info.lines.length || info.speed" class="grid gap-3">
      <dl v-if="info.rows" class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <template v-for="row in info.rows" :key="row.label">
          <dt class="text-muted-foreground">{{ row.label }}</dt>
          <dd class="flex items-center gap-2 font-medium">
            <span v-if="row.color" class="size-2.5 shrink-0 rounded-full" :style="{ background: row.color }" aria-hidden="true" />
            {{ row.value }}
          </dd>
        </template>
      </dl>
      <MapSpeedLimit v-if="info.speed" :mph="info.speed.mph" :limit="info.speed.limit" />
      <ul v-if="info.lines.length" class="max-h-48 list-disc overflow-auto pl-5 text-sm">
        <li v-for="line in info.lines" :key="line">{{ line }}</li>
      </ul>
      <Button v-if="hit.type === 'train' && info.speed" :variant="following ? 'default' : 'outline'" size="sm" class="justify-self-start" @click="emit('follow', !following)">
        <Crosshair />
        {{ following ? 'Following: click to stop' : 'Follow this train' }}
      </Button>
      <MapGradePanel v-if="trainNow" :key="trainNow.id" :map="map" :live="live" :train="trainNow" />
    </CardContent>
  </Card>
</template>
