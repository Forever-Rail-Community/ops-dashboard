<script setup lang="ts">
// A report's status: New (blue), Confirmed by staff (amber), Fixed (green), Won't fix (gray).
defineProps<{ status: BugStatus }>()
const TONE: Record<BugStatus, PillTone> = { new: 'blue', confirmed: 'amber', fixed: 'green', wontfix: 'gray' }
</script>

<template>
  <PagePill :tone="TONE[status]">{{ BUG_STATUSES.find((s) => s.value === status)!.label }}</PagePill>
</template>
