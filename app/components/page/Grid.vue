<script setup lang="ts">
// Cards side by side, as many as fit at `min` px wide each, wrapping on narrow screens.
const props = withDefaults(defineProps<{ min?: number }>(), { min: 240 })
const style = computed(() => ({ gridTemplateColumns: `repeat(auto-fit, minmax(min(${props.min}px, 100%), 1fr))` }))
</script>

<template>
  <div class="grid items-stretch gap-4" :style="style">
    <slot />
  </div>
</template>
