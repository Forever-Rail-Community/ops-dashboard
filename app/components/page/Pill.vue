<script setup lang="ts">
// A short status label, colored by what it means (see PillTone in utils/page.ts).

const TONES: Record<PillTone, string> = {
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300',
  blue: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  violet: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  gray: 'bg-muted text-muted-foreground'
}

withDefaults(defineProps<{ tone?: PillTone }>(), { tone: 'gray' })
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap" :class="TONES[tone]"><slot /></span>
</template>
