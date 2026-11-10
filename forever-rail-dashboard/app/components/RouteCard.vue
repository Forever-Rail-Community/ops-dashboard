<script setup lang="ts">
const props = defineProps<{
  route: RouteReport
  stale: boolean
  detailed: boolean
}>()

const online = computed(() => props.route.status === 'online')

// The lamp works like a signal: green is running, amber means the data is old, grey is down.
const lamp = computed(() => {
  if (props.stale) return 'bg-warning ring-warning/25'
  return online.value ? 'bg-success ring-success/25' : 'bg-accented ring-transparent'
})

const label = computed(() => {
  if (props.stale) return 'Last known: ' + (online.value ? 'online' : 'offline')
  return online.value ? 'Online' : 'Offline'
})
</script>

<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="size-3.5 rounded-full ring-4" :class="lamp" aria-hidden="true" />
        <div class="leading-tight">
          <h3 class="text-xl font-semibold">{{ route.name }}</h3>
          <p class="text-xs text-muted">Port {{ route.port }}</p>
        </div>
      </div>
      <span class="text-sm" :class="online && !stale ? 'text-success' : 'text-muted'">{{ label }}</span>
    </div>

    <dl v-if="online" class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <dt class="text-muted">Running for</dt>
      <dd class="text-right">{{ formatDuration(route.uptimeSec) }}</dd>
      <template v-if="detailed">
        <dt class="text-muted">CPU</dt>
        <dd class="text-right">{{ route.cpuPct != null ? `${route.cpuPct}%` : 'Unknown' }}</dd>
        <dt class="text-muted">Memory</dt>
        <dd class="text-right">{{ route.memMb != null ? `${route.memMb} MB` : 'Unknown' }}</dd>
        <dt class="text-muted">Process ID</dt>
        <dd class="text-right">{{ route.pid ?? 'Unknown' }}</dd>
      </template>
    </dl>
    <p v-else class="text-sm text-muted">Not running right now.</p>
  </UCard>
</template>
