<script setup lang="ts">
// A train's speed against the posted limit where its lead end is: a bar that fills toward the limit and turns
// amber past it. With no limit in the map data, just says so.
const props = defineProps<{ mph: number; limit?: number }>()

// A little over the limit is normal while a train settles, so only clearly over counts.
const OVER_BY_MPH = 2
const over = computed(() => props.limit !== undefined && props.mph > props.limit + OVER_BY_MPH)
const share = computed(() => (props.limit ? Math.min(1, props.mph / props.limit) : 0))
const { units, speed } = useUnits()
</script>

<template>
  <div class="grid gap-1.5 text-sm">
    <p class="flex items-baseline justify-between gap-3">
      <span><span class="text-lg font-semibold tabular-nums">{{ speedValue(mph, units) }}</span> {{ speedUnit(units) }}</span>
      <span :class="over ? 'font-medium text-amber-700 dark:text-amber-400' : 'text-muted-foreground'">
        {{ limit === undefined ? 'No limit in the map data' : over ? `Over the ${speed(limit)} limit` : `Limit ${speed(limit)}` }}
      </span>
    </p>
    <div v-if="limit !== undefined" class="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
      <div class="h-full rounded-full transition-[width]" :class="over ? 'bg-amber-500' : 'bg-primary'" :style="{ width: `${share * 100}%` }" />
    </div>
  </div>
</template>
