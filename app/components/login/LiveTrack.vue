<script setup lang="ts">
// The railroad as line art (public/railroad-outline.svg), with each Railroader train where it is now and a ring on
// `marked`: the place of the newest card.
defineProps<{ trains: PulseTrain[]; marked?: PulsePlace }>()
const palette = useMapPalette()
const at = (p: PulsePlace) => ({ left: `${p.left}%`, top: `${p.top}%` })
</script>

<template>
  <div class="relative" aria-hidden="true">
    <!-- Invisible, to give the box the drawing's shape; the drawing itself is a mask, so it takes a theme color. -->
    <img src="/railroad-outline.svg" alt="" class="w-full opacity-0" />
    <div class="absolute inset-0 bg-[#f2b134]/55 [mask-image:url(/railroad-outline.svg)] [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat] dark:bg-[#f2b134]/40" />
    <span
      v-for="t in trains"
      :key="t.id"
      class="absolute size-2.5 -translate-1/2 rounded-full transition-[left,top] duration-[9s] ease-linear motion-reduce:transition-none"
      :class="{ 'opacity-50': t.speedMph === 0 }"
      :style="{ ...at(t), background: palette.train, boxShadow: `0 0 0 4px color-mix(in srgb, ${palette.train} 22%, transparent)` }"
    />
    <template v-if="marked">
      <span class="absolute size-5 -translate-1/2 rounded-full border-2 border-foreground/80" :style="at(marked)" />
      <span :key="`${marked.left},${marked.top}`" class="absolute size-5 -translate-1/2 rounded-full border-2 border-foreground/50 motion-safe:animate-ping" :style="at(marked)" />
    </template>
  </div>
</template>
