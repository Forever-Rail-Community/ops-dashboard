<script setup lang="ts">
// One map symbol, drawn by the same code the map uses.
const props = defineProps<{ symbol: MapSymbol }>()

const SIZE = 24 // CSS pixels
const canvas = ref<HTMLCanvasElement>()
const palette = useMapPalette()

function draw() {
  const el = canvas.value
  const ctx = el?.getContext('2d')
  if (!el || !ctx) return
  const dpr = window.devicePixelRatio || 1
  el.width = SIZE * dpr
  el.height = SIZE * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, SIZE, SIZE)
  drawSymbol(ctx, props.symbol, SIZE / 2, SIZE / 2, palette.value)
}

onMounted(draw)
watch([palette, () => props.symbol], draw)
</script>

<template>
  <canvas ref="canvas" class="size-6 shrink-0" aria-hidden="true" />
</template>
