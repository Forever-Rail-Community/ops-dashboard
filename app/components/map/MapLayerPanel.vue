<script setup lang="ts">
const layers = defineModel<MapLayers>({ required: true })

const setLayer = (key: keyof MapLayers, on: boolean | 'indeterminate') => {
  layers.value = { ...layers.value, [key]: on === true }
}
</script>

<template>
  <Card>
    <CardHeader><CardTitle class="text-base">Layers</CardTitle></CardHeader>
    <CardContent class="grid gap-2.5 text-sm">
      <label v-for="option in LAYER_OPTIONS" :key="option.key" class="flex items-center gap-2">
        <Checkbox :model-value="layers[option.key]" @update:model-value="setLayer(option.key, $event)" />
        {{ option.label }}
      </label>
    </CardContent>
  </Card>
</template>
