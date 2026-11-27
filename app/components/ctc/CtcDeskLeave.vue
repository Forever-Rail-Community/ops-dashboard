<script setup lang="ts">
// Clocking out of a desk (board I): a turnover note for whoever clocks in next, starting from what the board shows is still in
// effect (ctcDeskBoard.ts, turnoverItems), plus anything else worth knowing.
const props = defineProps<{ desk: BoardDesk; items: string[]; busy?: boolean }>()
const emit = defineEmits<{ leave: [note: { items: string[]; text: string }]; cancel: [] }>()

const kept = ref(new Set(props.items))
const text = ref('')
const toggle = (item: string, on: boolean | 'indeterminate') => (on === true ? kept.value.add(item) : kept.value.delete(item))
const leave = () => emit('leave', { items: props.items.filter((i) => kept.value.has(i)), text: text.value.trim() })
</script>

<template>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Clock out of {{ desk.name }}</DialogTitle>
      <DialogDescription>Write a turnover note for whoever clocks in next. They'll read it before they can clock in.</DialogDescription>
    </DialogHeader>

    <div class="grid gap-2">
      <Label>Still in effect</Label>
      <p class="-mt-1 text-sm text-muted-foreground">
        {{ items.length ? "From the board. Untick anything the next dispatcher doesn't need." : 'Nothing on the board: no routes cleared, switches reversed, or trains waiting in a siding.' }}
      </p>
      <label v-for="item in items" :key="item" class="flex items-center gap-2 text-sm">
        <Checkbox :model-value="kept.has(item)" @update:model-value="(v) => toggle(item, v)" /> {{ item }}
      </label>
    </div>

    <div class="grid gap-2">
      <Label for="turnover-text">Anything else</Label>
      <Textarea id="turnover-text" v-model="text" rows="4" :maxlength="DESK_NOTE_MAX" placeholder="Track work, trains waiting for a crew, anything slow to answer…" />
    </div>

    <p class="text-sm text-muted-foreground">It's left open after you go, and worked from the game's own CTC panel until someone clocks in.</p>

    <DialogFooter>
      <Button variant="outline" @click="emit('cancel')">Cancel</Button>
      <Button :disabled="busy" @click="leave">Clock out</Button>
    </DialogFooter>
  </DialogContent>
</template>
