<script setup lang="ts">
defineProps<{ scope: RoadmapScope }>()
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-xs" :class="SCOPE_TINT[scope]">{{ scopeLabel(scope) }}</span>
</template>
