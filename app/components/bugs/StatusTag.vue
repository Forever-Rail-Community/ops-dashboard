<script setup lang="ts">
defineProps<{ status: BugStatus }>()
const TINT: Record<BugStatus, string> = {
  new: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  confirmed: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  fixed: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  wontfix: 'bg-muted text-muted-foreground'
}
</script>

<template>
  <span class="shrink-0 rounded-full px-2 py-0.5 text-xs" :class="TINT[status]">{{ BUG_STATUSES.find((s) => s.value === status)!.label }}</span>
</template>
