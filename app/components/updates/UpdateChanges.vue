<script setup lang="ts">
// An update's changes, each with the part of the dashboard it's in.
defineProps<{ changes: UpdateChange[] }>()
</script>

<template>
  <ul class="grid gap-2.5">
    <li v-for="(change, i) in changes" :key="i" class="grid gap-0.5 text-sm">
      <span class="text-xs text-muted-foreground">{{ change.area }}</span>
      <span>{{ change.text }}</span>
    </li>
  </ul>
</template>
