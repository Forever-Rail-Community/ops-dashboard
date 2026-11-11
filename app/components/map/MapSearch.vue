<script setup lang="ts">
import { Search } from '@lucide/vue'

const props = defineProps<{ map: MapData }>()
const emit = defineEmits<{ pick: [hit: MapHit] }>()

const { areaById } = useMapIndex(props.map)
const query = ref('')

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (q.length < 2) return []
  const matches = (name: string) => name.toLowerCase().includes(q)
  return [
    ...props.map.areas.filter((a) => matches(a.name)).map((a) => ({ hit: placeHit(a), sub: 'Town or area' })),
    ...props.map.industries
      .filter((i) => matches(i.name))
      .map((i) => ({ hit: industryHit(i), sub: areaById.get(i.area)?.name ?? '' }))
  ].slice(0, 8)
})

function pick(hit: MapHit) {
  emit('pick', hit)
  query.value = ''
}
</script>

<template>
  <div class="relative">
    <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input v-model="query" class="pl-9" placeholder="Find a town or industry" aria-label="Find a town or industry" />
    <ul v-if="results.length" class="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-popover text-sm shadow-md">
      <li v-for="r in results" :key="r.hit.type + r.hit.id">
        <button type="button" class="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-accent" @click="pick(r.hit)">
          <span class="font-medium">{{ r.hit.name }}</span>
          <span class="text-xs text-muted-foreground">{{ r.sub }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>
