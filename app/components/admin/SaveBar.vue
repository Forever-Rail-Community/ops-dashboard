<script setup lang="ts">
// Appears at the bottom of the page once something has changed, so nothing is left unsaved by accident.
defineProps<{ dirty: boolean; saving: boolean }>()
const emit = defineEmits<{ save: []; discard: [] }>()
</script>

<template>
  <div
    v-if="dirty" role="status"
    class="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-[14px] border bg-muted py-3 pr-3 pl-4.5 shadow-[0_12px_32px_rgb(0_0_0/.35)]"
  >
    <span class="size-2 rounded-full bg-amber-400" />
    <span class="text-sm">You have unsaved changes.</span>
    <span class="ml-auto flex gap-2">
      <Button variant="outline" :disabled="saving" @click="emit('discard')">Discard</Button>
      <Button :disabled="saving" @click="emit('save')">{{ saving ? 'Saving…' : 'Save changes' }}</Button>
    </span>
  </div>
</template>
