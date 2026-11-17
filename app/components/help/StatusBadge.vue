<script setup lang="ts">
// An article's state, in words: never published, live, or live with unpublished edits.
const props = defineProps<{ status: HelpStatus }>()

const look: Record<HelpStatus, { label: string; class: string }> = {
  draft: { label: 'Draft', class: 'border-border bg-muted text-muted-foreground' },
  published: { label: 'Published', class: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400' },
  changed: { label: 'Unpublished changes', class: 'border-amber-600/30 bg-amber-500/10 text-amber-800 dark:text-amber-300' }
}
const current = computed(() => look[props.status])
</script>

<template>
  <Badge variant="outline" :class="current.class">{{ current.label }}</Badge>
</template>
