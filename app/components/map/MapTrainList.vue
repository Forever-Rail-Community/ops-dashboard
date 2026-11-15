<script setup lang="ts">
import { Search } from '@lucide/vue'

// Every live train, moving ones first. Picking one selects it on the map and jumps there.
const props = defineProps<{ map: MapData; trains: LiveTrain[]; stale: boolean; selectedId?: string }>()
const emit = defineEmits<{ pick: [train: LiveTrain] }>()

const query = ref('')

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.trains
    .filter((t) => !q || t.name.toLowerCase().includes(q))
    .sort((a, b) => Number(isMoving(b)) - Number(isMoving(a)) || a.name.localeCompare(b.name))
    .map((train) => ({
      train,
      speed: isMoving(train) ? `${Math.round(train.speedMph)} mph` : 'Stopped',
      where: trainWhere(props.map, train),
      cars: `${train.cars} ${train.cars === 1 ? 'car' : 'cars'}`
    }))
})
</script>

<template>
  <div class="grid gap-2">
    <div v-if="trains.length > 4" class="relative">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="query" class="pl-9" placeholder="Find a train" aria-label="Find a train by its callsign" />
    </div>

    <p v-if="!trains.length" class="px-1 py-2 text-sm text-muted-foreground">
      No trains reported. They appear here when the Railroader game server sends positions.
    </p>
    <p v-else-if="!rows.length" class="px-1 py-2 text-sm text-muted-foreground">No train matches "{{ query }}".</p>

    <ul class="grid gap-0.5" :class="{ 'opacity-60': stale }">
      <li v-for="row in rows" :key="row.train.id">
        <button
          type="button"
          class="grid w-full gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
          :class="{ 'bg-accent': row.train.id === selectedId }"
          :aria-current="row.train.id === selectedId ? 'true' : undefined"
          @click="emit('pick', row.train)"
        >
          <span class="flex items-baseline justify-between gap-3">
            <span class="font-medium">{{ row.train.name }}</span>
            <span class="tabular-nums" :class="isMoving(row.train) ? '' : 'text-muted-foreground'">{{ row.speed }}</span>
          </span>
          <span class="flex justify-between gap-3 text-xs text-muted-foreground">
            <span class="truncate">{{ row.where }}</span>
            <span class="shrink-0">{{ row.cars }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
