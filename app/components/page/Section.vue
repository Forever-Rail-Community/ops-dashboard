<script setup lang="ts">
import type { Component } from 'vue'

// A card on a page: icon, title with a count, one line saying what it holds, an optional link or button (the `action`
// slot), then its rows (PageRow). With `rowHeight` (px), every row is that tall and the list shows five, then
// scrolls. With `count` 0 and an `empty` slot, that shows instead. Content that isn't rows (a form, details) goes in
// the default slot with no `empty` slot.
const props = withDefaults(defineProps<{ icon: Component; title: string; description: string; count?: number; rowHeight?: number }>(), {
  count: 0,
  rowHeight: undefined
})
const VISIBLE_ROWS = 5
const listStyle = computed(() =>
  props.rowHeight && props.count > VISIBLE_ROWS ? { maxHeight: `${props.rowHeight * VISIBLE_ROWS}px` } : undefined
)
if (props.rowHeight) provide(PAGE_ROW_HEIGHT, props.rowHeight)
const id = useId()
</script>

<template>
  <section :aria-labelledby="id" class="flex min-w-0 flex-col rounded-2xl border bg-card px-6 pt-5 pb-2.5 text-card-foreground">
    <div class="flex items-center gap-2.5">
      <component :is="icon" class="size-[18px] shrink-0" />
      <h2 :id="id" class="text-[17px] leading-6 font-semibold">{{ title }}</h2>
      <span
        v-if="count"
        class="inline-flex h-5 items-center rounded-full border bg-muted px-2 text-xs leading-none font-semibold tabular-nums"
      >{{ count }}</span>
      <div class="ml-auto text-[13px]">
        <slot name="action" />
      </div>
    </div>
    <p class="mt-1.5 mb-2 text-[13px] text-muted-foreground">{{ description }}</p>
    <div v-if="count || !$slots.empty" class="overflow-y-auto overscroll-contain [scrollbar-width:thin]" :style="listStyle">
      <slot />
    </div>
    <div v-else class="border-t py-4 text-sm text-muted-foreground">
      <slot name="empty" />
    </div>
  </section>
</template>
