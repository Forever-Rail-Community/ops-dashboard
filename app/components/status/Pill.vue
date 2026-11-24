<script setup lang="ts">
// Up or down. When the agent has gone quiet it says "Last known" so nobody mistakes old news for current.
const props = defineProps<{ online: boolean; stale: boolean; onlineText: string; offlineText: string }>()
const text = computed(() => {
  const state = props.online ? props.onlineText : props.offlineText
  return props.stale ? `Last known: ${state.toLowerCase()}` : state
})
</script>

<template>
  <PagePill :tone="online && !stale ? 'green' : 'gray'">{{ text }}</PagePill>
</template>
