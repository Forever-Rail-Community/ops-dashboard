<script setup lang="ts">
// One fact about a server: a small label and its value (the default slot).
defineProps<{ label: string }>()
</script>

<template>
  <div>
    <div class="text-xs text-muted-foreground">{{ label }}</div>
    <div class="mt-0.5 text-sm font-medium"><slot /></div>
  </div>
</template>
