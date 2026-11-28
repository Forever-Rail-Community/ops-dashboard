<script setup lang="ts">
// Clocking out of a desk, from the Desks page or the CTC board: the turnover note dialog (CtcDeskLeave) for the desk in
// v-model, with what the board shows is still in effect there (turnoverItems). The page does the saving.
const desk = defineModel<BoardDesk>()
const props = defineProps<{
  board: Board
  aspects: Record<string, SignalAspect>
  thrown: Record<string, boolean>
  trains: BoardTrain[]
  busy?: boolean
}>()
const emit = defineEmits<{ leave: [id: string, note: { items: string[]; text: string }] }>()

const open = computed({ get: () => !!desk.value, set: (v) => { if (!v) desk.value = undefined } })
const items = computed(() => (desk.value ? turnoverItems(props.board, desk.value, props.aspects, props.thrown, props.trains) : []))
function leave(note: { items: string[]; text: string }) {
  emit('leave', desk.value!.id, note)
  desk.value = undefined
}
</script>

<template>
  <Dialog v-model:open="open">
    <CtcDeskLeave v-if="desk" :desk="desk" :items="items" :busy="busy" @leave="leave" @cancel="desk = undefined" />
  </Dialog>
</template>
