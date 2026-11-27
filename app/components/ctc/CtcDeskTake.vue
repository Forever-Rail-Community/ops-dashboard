<script setup lang="ts">
// Clocking in to a desk (board J): the turnover note the last dispatcher left, which has to be read first. A note with nothing
// in it isn't shown, and there's nothing to confirm.
const props = defineProps<{ desk: BoardDesk; line: CtcLine; busy?: boolean }>()
const emit = defineEmits<{ take: []; cancel: [] }>()

const left = computed(() => props.desk.span.desk.note)
const note = computed(() => (left.value && (left.value.items.length || left.value.text.trim()) ? left.value : null))
const read = ref(false)
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
</script>

<template>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Clock in to {{ desk.name }}</DialogTitle>
      <DialogDescription>
        {{ desk.stretch }}.
        <template v-if="note">Review the turnover note from {{ note.by }} ({{ when(note.at) }}) before clocking in.</template>
        <template v-else-if="left">{{ left.by }} clocked out at {{ when(left.at) }} without a turnover note.</template>
        <template v-else>No turnover note is on file for this desk.</template>
      </DialogDescription>
    </DialogHeader>

    <div v-if="note" class="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
      <ul v-if="note.items.length" class="grid list-disc gap-1 pl-5">
        <li v-for="item in note.items" :key="item">{{ item }}</li>
      </ul>
      <p v-if="note.text" class="whitespace-pre-line">{{ note.text }}</p>
    </div>

    <label v-if="note" class="flex items-center gap-2 text-sm">
      <Checkbox v-model="read" /> I have read the turnover note
    </label>

    <DialogFooter>
      <Button variant="outline" @click="emit('cancel')">Cancel</Button>
      <Button :disabled="busy || (!!note && !read)" @click="emit('take')">Clock in</Button>
    </DialogFooter>
  </DialogContent>
</template>
