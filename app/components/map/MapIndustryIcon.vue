<script setup lang="ts">
// An industry's map symbol in its main type's color: a diamond for passenger stops, a square for the rest.
const props = defineProps<{ industry: MapIndustry }>()
const palette = useMapPalette()
const symbol = computed<MapSymbol>(() => (isPassengerStop(props.industry) ? 'stop' : 'industry'))
const fill = computed(() => palette.value.industry[industryType(props.industry)])
</script>

<template>
  <MapSymbolIcon :symbol="symbol" :fill="fill" />
</template>
