<script setup lang="ts">
const props = defineProps<{ map: MapData }>()
const emit = defineEmits<{ pick: [hit: MapHit] }>()

const places = computed(() => [...props.map.areas].sort((a, b) => a.name.localeCompare(b.name)))
</script>

<template>
  <Card>
    <CardHeader><CardTitle class="text-base">Places</CardTitle></CardHeader>
    <CardContent class="flex max-h-60 flex-col gap-0.5 overflow-auto text-sm">
      <button
        v-for="area in places"
        :key="area.id"
        type="button"
        class="rounded-md px-2 py-1.5 text-left hover:bg-accent"
        @click="emit('pick', placeHit(area))"
      >
        {{ area.name }}
      </button>
    </CardContent>
  </Card>
</template>
