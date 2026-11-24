<script setup lang="ts">
// The top of a page: its title, one line saying what it's for, and the page's main buttons (the `actions` slot).
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div class="flex flex-wrap items-end gap-4">
    <div class="min-w-64 flex-1">
      <h1 class="text-3xl font-semibold tracking-tight">{{ title }}</h1>
      <p v-if="description" class="mt-1.5 text-[15px] text-muted-foreground">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex flex-wrap gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
