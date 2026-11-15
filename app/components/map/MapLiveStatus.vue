<script setup lang="ts">
// One line above the map saying whether train positions are live, old, or not coming in at all.
const props = defineProps<{ response: LiveResponse | null | undefined; failed: boolean }>()

const text = computed(() => {
  const r = props.response
  if (props.failed) return "Can't load train positions right now."
  if (!r) return 'Loading train positions…'
  const { ageSec, stale } = r.trainsAge
  if (ageSec === null) return 'No trains reported yet. Positions appear when the Railroader game server starts sending them.'
  const count = `${r.trains.length} ${r.trains.length === 1 ? 'train' : 'trains'}`
  if (stale) return `The game server stopped reporting ${formatAge(ageSec)}. Showing the last known positions of ${count}.`
  return `${count} live, updated ${formatAge(ageSec)}.`
})
const warn = computed(() => props.failed || props.response?.trainsAge.stale)
</script>

<template>
  <p class="flex items-center gap-2 text-sm" :class="warn ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'" role="status">
    <span class="size-2 shrink-0 rounded-full" :class="warn ? 'bg-amber-500' : response?.trains.length ? 'bg-emerald-500' : 'bg-muted-foreground/50'" />
    {{ text }}
  </p>
</template>
