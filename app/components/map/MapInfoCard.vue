<script setup lang="ts">
const props = defineProps<{ map: MapData; hit: MapHit }>()

const { areaById, industryById, industriesIn } = useMapIndex(props.map)

// Title, subtitle and a short list, whatever kind of thing was selected.
const info = computed(() => {
  const { hit } = props
  if (hit.type === 'place') {
    return { title: hit.name, sub: 'Town or area', lines: industriesIn(hit.id).map((i) => i.name) }
  }
  if (hit.type === 'industry') {
    const industry = industryById.get(hit.id)
    return {
      title: hit.name,
      sub: areaById.get(industry?.area ?? '')?.name ?? '',
      lines: (industry?.kinds ?? []).map((k) => KIND_TEXT[k])
    }
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
    <CardContent v-if="info.lines.length">
      <ul class="max-h-48 list-disc overflow-auto pl-5 text-sm">
        <li v-for="line in info.lines" :key="line">{{ line }}</li>
      </ul>
    </CardContent>
  </Card>
</template>
