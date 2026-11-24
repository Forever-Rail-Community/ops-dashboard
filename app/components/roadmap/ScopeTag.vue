<script setup lang="ts">
// Which part of the Operations Center an item or request is about.
defineProps<{ scope: RoadmapScope }>()
</script>

<template>
  <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
    <component :is="SCOPE_ICON[scope]" class="size-3.5" />{{ scopeLabel(scope) }}
  </span>
</template>
