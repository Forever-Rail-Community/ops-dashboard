<script setup lang="ts">
// Who suggested something: a round initial and their name.
defineProps<{ name: string }>()
</script>

<template>
  <span class="flex min-w-0 items-center gap-1.5">
    <span class="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">{{ name.slice(0, 1).toUpperCase() }}</span>
    <span class="truncate">{{ name }}</span>
  </span>
</template>
