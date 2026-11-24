<script setup lang="ts">
// An article's state, in words: never published, live, or live with unpublished edits.
defineProps<{ status: HelpStatus }>()
const LOOK: Record<HelpStatus, { label: string; tone: PillTone }> = {
  draft: { label: 'Draft', tone: 'amber' },
  published: { label: 'Published', tone: 'green' },
  changed: { label: 'Changes not published', tone: 'blue' }
}
</script>

<template>
  <PagePill :tone="LOOK[status].tone">{{ LOOK[status].label }}</PagePill>
</template>
