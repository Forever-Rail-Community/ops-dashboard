<script setup lang="ts">
import type { Component } from 'vue'

// One row of a section: a title, a detail line under it, and something on the right (the `trailing` slot), each
// kept to one line. Inside a section with a row height, every row is exactly that tall. `as` makes the row a button
// or a link; pass the title in the `title` slot to style it.
withDefaults(defineProps<{ title?: string; detail?: string; as?: string | Component }>(), { as: 'div' })
const height = inject(PAGE_ROW_HEIGHT, undefined)
</script>

<template>
  <component
    :is="as"
    class="flex w-full items-center gap-3 border-t text-left"
    :class="height ? '' : 'min-h-[60px] py-2'"
    :style="height ? { height: `${height}px` } : undefined"
  >
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold"><slot name="title">{{ title }}</slot></span>
      <span v-if="detail || $slots.detail" class="block truncate text-[13px] text-muted-foreground">
        <slot name="detail">{{ detail }}</slot>
      </span>
    </span>
    <slot name="trailing" />
  </component>
</template>
