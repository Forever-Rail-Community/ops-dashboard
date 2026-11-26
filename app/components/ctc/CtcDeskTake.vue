<script setup lang="ts">
// Taking a desk (board J): the turnover note the last dispatcher left, which has to be read first.
const props = defineProps<{ desk: BoardDesk; line: CtcLine; busy?: boolean }>()
const emit = defineEmits<{ take: []; cancel: [] }>()

const note = computed(() => props.desk.span.desk.note)
const read = ref(false)
const when = (iso: string) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
</script>

<template>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Take {{ desk.name }}</DialogTitle>
      <DialogDescription>
        {{ desk.stretch }}.
        <template v-if="note">{{ note.by }} left it at {{ when(note.at) }}, with this turnover note.</template>
        <template v-else>Nobody left a turnover note for it.</template>
      </DialogDescription>
    </DialogHeader>

    <div v-if="note" class="grid gap-3 rounded-md border bg-muted/40 p-3 text-sm">
      <ul v-if="note.items.length" class="grid list-disc gap-1 pl-5">
        <li v-for="item in note.items" :key="item">{{ item }}</li>
      </ul>
      <p v-if="note.text" class="whitespace-pre-line">{{ note.text }}</p>
    </div>

    <label v-if="note" class="flex items-center gap-2 text-sm">
      <Checkbox v-model="read" /> I've read the turnover note
    </label>

    <DialogFooter>
      <Button variant="outline" @click="emit('cancel')">Cancel</Button>
      <Button :disabled="busy || (!!note && !read)" @click="emit('take')">Take {{ desk.name }}</Button>
    </DialogFooter>
  </DialogContent>
</template>
