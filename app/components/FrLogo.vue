<script setup lang="ts">
// The Forever Rail logo as shapes (app/utils/frLogo.ts). Each shape's length is 1, so its outline can be drawn in
// with stroke-dashoffset. Style it with fill and stroke from outside.
</script>

<template>
  <svg :viewBox="FR_LOGO_VIEWBOX" aria-hidden="true">
    <template v-for="(s, k) in FR_LOGO_SHAPES" :key="k">
      <polygon v-if="s.tag === 'polygon'" :points="s.points" path-length="1" />
      <path v-else :d="s.d" path-length="1" />
    </template>
  </svg>
</template>
