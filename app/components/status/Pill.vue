<script setup lang="ts">
// Up/down badge. When the agent has gone quiet it says "Last known" so nobody mistakes old news for current.
const props = defineProps<{ online: boolean; stale: boolean; onlineText: string; offlineText: string }>()
const text = computed(() => {
  const state = props.online ? props.onlineText : props.offlineText
  return props.stale ? `Last known: ${state.toLowerCase()}` : state
})
</script>

<template>
  <Badge
    v-if="online"
    variant="outline"
    class="gap-1.5 border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
  >
    <span class="size-1.5 rounded-full bg-emerald-600" />
    {{ text }}
  </Badge>
  <Badge v-else variant="secondary" class="gap-1.5">
    <span class="size-1.5 rounded-full bg-muted-foreground" />
    {{ text }}
  </Badge>
</template>
