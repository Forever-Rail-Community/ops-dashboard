<script setup lang="ts">
// One train in a card: its arrow, callsign, where it is, and its speed. Picking it selects it on the map.
const props = defineProps<{ map: MapData; train: LiveTrain; detail?: string }>()
const emit = defineEmits<{ pick: [] }>()
const moving = computed(() => isMoving(props.train))
</script>

<template>
  <button type="button" class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent" @click="emit('pick')">
    <MapSymbolIcon :symbol="moving ? 'trainMoving' : 'trainStopped'" />
    <span class="grid min-w-0 flex-1">
      <span class="font-medium">{{ train.name }}</span>
      <span class="truncate text-xs text-muted-foreground">{{ detail ?? trainWhere(map, train) }}</span>
    </span>
    <span class="shrink-0 tabular-nums" :class="moving ? '' : 'text-muted-foreground'">{{ moving ? `${Math.round(train.speedMph)} mph` : 'Stopped' }}</span>
  </button>
</template>
