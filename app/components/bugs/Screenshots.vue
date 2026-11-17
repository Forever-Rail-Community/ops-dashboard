<script setup lang="ts">
// A report's screenshots as thumbnails; each opens full size in a new tab.
defineProps<{ ids: number[]; size?: 'small' | 'large' }>()
</script>

<template>
  <div v-if="ids.length" class="flex flex-wrap gap-2">
    <a v-for="(id, i) in ids" :key="id" :href="`/api/bugs/screenshots/${id}`" target="_blank" rel="noopener" class="overflow-hidden rounded-lg border bg-muted hover:opacity-90">
      <img :src="`/api/bugs/screenshots/${id}`" :alt="`Screenshot ${i + 1}`" loading="lazy" class="object-cover" :class="size === 'large' ? 'h-24 w-36' : 'size-14'" />
    </a>
  </div>
</template>
