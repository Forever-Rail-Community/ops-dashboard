<script setup lang="ts">
import { Crosshair } from '@lucide/vue'

const props = defineProps<{ map: MapData; hit: MapHit; live: LiveMapData; following: boolean }>()
const emit = defineEmits<{ follow: [on: boolean] }>()

// Title, subtitle and a short list for a train, a switch or plain track. Towns and industries have their own cards.
const info = computed(() => {
  const { hit } = props
  if (hit.type === 'train') {
    // Read the train from the latest positions, so the card stays current while it moves.
    const train = props.live.trains.find((t) => t.id === hit.id)
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
  if (hit.type === 'switch') {
    const text = switchText(props.live.switches[hit.id])
    return { title: 'Switch', sub: props.live.switchesStale ? `Last known: ${text}` : text, lines: [] }
  }
  return {
    title: 'Track',
    sub: hit.speed ? `Posted speed limit: ${hit.speed} mph` : 'No speed limit set in the map data',
    lines: []
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-base">{{ info.title }}</CardTitle>
      <CardDescription>{{ info.sub }}</CardDescription>
    </CardHeader>
    <CardContent v-if="info.lines.length || 'speed' in info" class="grid gap-3">
      <MapSpeedLimit v-if="'speed' in info && info.speed" :mph="info.speed.mph" :limit="info.speed.limit" />
      <ul v-if="info.lines.length" class="max-h-48 list-disc overflow-auto pl-5 text-sm">
        <li v-for="line in info.lines" :key="line">{{ line }}</li>
      </ul>
      <Button v-if="hit.type === 'train' && 'speed' in info" :variant="following ? 'default' : 'outline'" size="sm" class="justify-self-start" @click="emit('follow', !following)">
        <Crosshair />
        {{ following ? 'Following: click to stop' : 'Follow this train' }}
      </Button>
    </CardContent>
  </Card>
</template>
