<script setup lang="ts">
import { GripVertical } from '@lucide/vue'

// Edit desks (board H): each desk's name and where it starts, for staff with "Set up the CTC board's lines". A desk
// starts at a town, taking all of it, or partway through one at its second control point; either way a train is
// handed over at a signal. The first desk starts at the line's start, and each runs up to the next one's start.
//
// The table is two lists side by side: the desks, in line order, and where each place on the line starts. Dragging a
// desk (or moving it with the arrow keys on its handle) changes which stretch it works; the starts stay put. A start can
// only move between its neighbors', so the line's order never changes underneath.
const props = defineProps<{ line: CtcLine; board: Board; desks: CtcDesk[]; busy?: boolean }>()
const emit = defineEmits<{ save: [desks: { id?: string; name: string; start: string }[]]; cancel: [] }>()

const MAX_DESKS = 12
interface Desk { id?: string; key: string; name: string }
const lineStart = props.line.towns[0]!.controlPoints[0]!
const order = props.line.towns.flatMap((t) => t.controlPoints)
const at = (cp: string) => order.indexOf(cp)

let nextKey = 0
const spans = deskSpans(props.line, props.desks)
const desks = ref<Desk[]>(spans.map((s) => ({ id: s.desk.id, key: s.desk.id, name: s.desk.name })))
const starts = ref<string[]>(spans.map((s, k) => (k ? s.desk.start : lineStart)))
if (!desks.value.length) {
  desks.value.push({ key: `new-${nextKey++}`, name: 'Desk 1' })
  starts.value.push(lineStart)
}

// "Starts at" choices for a place on the line, by town (all of it, or from its second control point on), each at its
// milepost, between the starts before and after it.
const points = new Map(props.board.points.map((p) => [p.id, p]))
const choices = (k: number) => {
  const from = at(starts.value[k - 1]!)
  const to = k + 1 < starts.value.length ? at(starts.value[k + 1]!) : order.length
  return props.line.towns.map((t, town) => ({
    town: t.name,
    options: t.controlPoints.filter((cp) => at(cp) > from && at(cp) < to).map((cp) => {
      const whole = cp === t.controlPoints[0]
      const mp = `MP ${(whole ? props.board.towns[town]!.milepost : milepostAt(props.board, points.get(cp)?.x ?? 0)).toFixed(1)}`
      return { value: cp, label: whole ? `All of ${t.name}, ${mp}` : `${points.get(cp)?.name ?? cp} on, ${mp}` }
    })
  })).filter((g) => g.options.length)
}
const startLabel = (cp: string) => choices(starts.value.indexOf(cp)).flatMap((g) => g.options).find((o) => o.value === cp)?.label ?? cp

// The desks as they'd be saved, for the bar and each row's "Covers".
const preview = computed(() => {
  const list: CtcDesk[] = desks.value.map((d, k) => ({
    id: d.key, lineId: props.line.id, name: d.name || `Desk ${k + 1}`, start: starts.value[k]!,
    holder: props.desks.find((x) => x.id === d.id)?.holder ?? null, note: null
  }))
  return boardDesks(props.line, props.board, deskSpans(props.line, list), '')
})
const covers = (k: number) => {
  const d = preview.value[k]
  return d ? `${d.stretch}, ${deskMileposts(props.board, d).miles.toFixed(1)} mi, ${spanSidings(props.line, d.span)} sidings` : ''
}
const problem = computed(() => {
  if (desks.value.some((d) => !d.name.trim())) return 'Every desk needs a name.'
  if (new Set(desks.value.map((d) => d.name.trim().toLowerCase())).size < desks.value.length) return 'Two desks have the same name.'
  return ''
})
const held = computed(() => props.desks.filter((d) => d.holder && !desks.value.some((x) => x.id === d.id)))

// A new desk takes the second half of the longest stretch, starting at a town where it can.
function add() {
  const longest = [...preview.value].sort((a, b) => b.span.controlPoints.length - a.span.controlPoints.length)[0]
  const cps = longest?.span.controlPoints ?? []
  if (cps.length < 2) return
  const townStarts = new Set(props.line.towns.map((t) => t.controlPoints[0]))
  const half = cps.slice(Math.ceil(cps.length / 2))
  const start = half.find((cp) => townStarts.has(cp)) ?? half[0]!
  const k = starts.value.findIndex((s) => at(s) > at(start))
  const place = k < 0 ? starts.value.length : k
  starts.value.splice(place, 0, start)
  desks.value.splice(place, 0, { key: `new-${nextKey++}`, name: `Desk ${desks.value.length + 1}` })
}

// Removing a desk joins its stretch to the one before (or, for the first desk, the one after).
function remove(k: number) {
  desks.value.splice(k, 1)
  starts.value.splice(Math.max(k, 1), 1)
}

function move(from: number, to: number) {
  if (to < 0 || to >= desks.value.length || from === to) return
  const [desk] = desks.value.splice(from, 1)
  desks.value.splice(to, 0, desk!)
}
const dragging = ref<number | null>(null)
function drop(k: number) {
  if (dragging.value !== null) move(dragging.value, k)
  dragging.value = null
}

const save = () => emit('save', desks.value.map((d, k) => ({ id: d.id, name: d.name.trim(), start: starts.value[k]! })))
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Edit desks</h1>
        <p class="text-muted-foreground">Where each desk on the {{ line.name }} starts, and what it's called.</p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="emit('cancel')">Cancel</Button>
        <Button :disabled="busy || !!problem" @click="save">Save changes</Button>
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Where each desk starts</CardTitle>
        <CardDescription>
          A desk can take a whole town, or start partway through one at its second control point. Either way trains are
          handed over at a signal. Each desk runs up to where the next one starts. Drag a desk by its handle to move it
          to another stretch. Dispatchers on a desk stay on it when it changes.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6">
        <CtcDeskStrip :board="board" :desks="preview" />
        <Table>
          <TableHeader>
            <TableRow><TableHead class="w-10" /><TableHead class="w-56">Name</TableHead><TableHead class="w-80">Starts at</TableHead><TableHead>Covers</TableHead><TableHead class="w-24" /></TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(d, k) in desks" :key="d.key" :class="dragging === k ? 'opacity-50' : ''"
              @dragover.prevent @drop.prevent="drop(k)"
            >
              <TableCell>
                <button
                  type="button" draggable="true" class="flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                  :aria-label="`Move ${d.name || `desk ${k + 1}`}: drag, or use the up and down arrow keys`"
                  @dragstart="dragging = k" @dragend="dragging = null"
                  @keydown.up.prevent="move(k, k - 1)" @keydown.down.prevent="move(k, k + 1)"
                ><GripVertical class="size-4" /></button>
              </TableCell>
              <TableCell><Input v-model="d.name" maxlength="40" :aria-label="`Desk ${k + 1}'s name`" /></TableCell>
              <TableCell>
                <span v-if="k === 0" class="text-sm">{{ line.towns[0]?.name }}, the start of the line</span>
                <Select v-else v-model="starts[k]">
                  <SelectTrigger class="w-full" :aria-label="`Where ${d.name || `desk ${k + 1}`} starts`">
                    <SelectValue>{{ startLabel(starts[k]!) }}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup v-for="g in choices(k)" :key="g.town">
                      <SelectLabel>{{ g.town }}</SelectLabel>
                      <SelectItem v-for="o in g.options" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ covers(k) }}</TableCell>
              <TableCell class="text-right">
                <Button v-if="desks.length > 1" variant="ghost" size="sm" @click="remove(k)">Remove</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="secondary" :disabled="desks.length >= MAX_DESKS || desks.length >= order.length" @click="add">Add a desk</Button>
          <span v-if="problem" class="text-sm text-destructive">{{ problem }}</span>
          <span v-else-if="held.length" class="text-sm text-amber-700 dark:text-amber-300">
            Saving takes {{ held.map((d) => d.holder!.name).join(' and ') }} off {{ held.map((d) => d.name).join(' and ') }}, which you've removed.
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
