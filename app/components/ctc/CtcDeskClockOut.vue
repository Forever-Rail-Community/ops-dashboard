<script setup lang="ts">
// Clocking out, from the Desks page or the CTC board: the turnover note dialog (CtcDeskLeave) for the desks in v-model
// (one, or all of yours at once; empty when closed), with what the board shows is still in effect on each
// (turnoverItems). The page does the saving.
const desks = defineModel<BoardDesk[]>({ default: () => [] })
const props = defineProps<{
  board: Board
  aspects: Record<string, SignalAspect>
  thrown: Record<string, boolean>
  trains: BoardTrain[]
  busy?: boolean
}>()
const emit = defineEmits<{ leave: [notes: DeskLeaveNote[]] }>()

const close = () => (desks.value = [])
const open = computed({ get: () => desks.value.length > 0, set: (v) => { if (!v) close() } })
const items = computed(() =>
  Object.fromEntries(desks.value.map((d) => [d.id, turnoverItems(props.board, d, props.aspects, props.thrown, props.trains)])))
function leave(notes: DeskLeaveNote[]) {
  emit('leave', notes)
  close()
}
</script>

<template>
  <Dialog v-model:open="open">
    <CtcDeskLeave v-if="open" :desks="desks" :items="items" :busy="busy" @leave="leave" @cancel="close" />
  </Dialog>
</template>
