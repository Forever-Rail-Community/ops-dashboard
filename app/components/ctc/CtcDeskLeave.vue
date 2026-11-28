<script setup lang="ts">
// Clocking out of one desk or several at once (board I): a turnover note for whoever clocks in next, starting from what
// the board shows is still in effect on each desk (ctcDeskBoard.ts, turnoverItems), plus anything else worth knowing,
// which goes on every desk's note.
const props = defineProps<{ desks: BoardDesk[]; items: Record<string, string[]>; busy?: boolean }>()
const emit = defineEmits<{ leave: [notes: DeskLeaveNote[]]; cancel: [] }>()

const key = (deskId: string, item: string) => `${deskId}\n${item}`
const kept = ref(new Set(props.desks.flatMap((d) => (props.items[d.id] ?? []).map((i) => key(d.id, i)))))
const text = ref('')
const toggle = (k: string, on: boolean | 'indeterminate') => (on === true ? kept.value.add(k) : kept.value.delete(k))
const withItems = computed(() => props.desks.filter((d) => props.items[d.id]?.length))
const title = computed(() => (props.desks.length === 1 ? `Clock out of ${props.desks[0]!.name}` : `Clock out of ${props.desks.length} desks`))
const leave = () => emit('leave', props.desks.map((d) => ({
  id: d.id,
  items: (props.items[d.id] ?? []).filter((i) => kept.value.has(key(d.id, i))),
  text: text.value.trim()
})))
</script>

<template>
  <DialogContent class="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>{{ title }}</DialogTitle>
      <DialogDescription>
        Write a turnover note for the next dispatcher. They must read it before clocking in.
        <template v-if="desks.length > 1"> Each desk keeps its own items; the additional notes go on every desk.</template>
      </DialogDescription>
    </DialogHeader>

    <div class="grid max-h-[40vh] gap-2 overflow-y-auto">
      <Label>Still in effect</Label>
      <p class="-mt-1 text-sm text-muted-foreground">
        {{ withItems.length ? 'Taken from the board. Uncheck any item the next dispatcher does not need.' : 'Nothing to report from the board: no cleared routes, reversed switches or trains held in sidings.' }}
      </p>
      <div v-for="d in withItems" :key="d.id" class="grid gap-2">
        <p v-if="desks.length > 1" class="text-sm font-medium">{{ d.name }}</p>
        <label v-for="item in items[d.id]" :key="item" class="flex items-center gap-2 text-sm">
          <Checkbox :model-value="kept.has(key(d.id, item))" @update:model-value="(v) => toggle(key(d.id, item), v)" /> {{ item }}
        </label>
      </div>
    </div>

    <div class="grid gap-2">
      <Label for="turnover-text">Additional notes</Label>
      <Textarea id="turnover-text" v-model="text" rows="4" :maxlength="DESK_NOTE_MAX" placeholder="Track work, trains awaiting crews, control points slow to respond…" />
    </div>

    <p class="text-sm text-muted-foreground">
      After you clock out, {{ desks.length === 1 ? 'the desk is' : 'the desks are' }} open and worked from the in-game CTC panel until another dispatcher clocks in.
    </p>

    <DialogFooter>
      <Button variant="outline" @click="emit('cancel')">Cancel</Button>
      <Button :disabled="busy" @click="leave">Clock out</Button>
    </DialogFooter>
  </DialogContent>
</template>
