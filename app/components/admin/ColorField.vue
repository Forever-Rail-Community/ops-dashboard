<script setup lang="ts">
// A color picker with its hex value next to it, for the Appearance page.
defineProps<{ label: string }>()
const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="flex items-center gap-3">
    <input v-model="model" type="color" class="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1" :aria-label="label" />
    <Input v-model="model" class="w-32" :aria-label="`${label} hex value`" />
  </div>
</template>
