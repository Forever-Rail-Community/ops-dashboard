<script setup lang="ts">
// Edit desks (board H): each desk's name and where it starts, for staff with "Set up the CTC board's lines". A desk
// starts at a town, taking all of it, or partway through one at its second control point; either way a train is
// handed over at a signal. The first desk starts at the line's start, and each runs up to the next one's start.
const props = defineProps<{ line: CtcLine; board: Board; desks: CtcDesk[]; busy?: boolean }>()
const emit = defineEmits<{ save: [desks: { id?: string; name: string; start: string }[]]; cancel: [] }>()

const MAX_DESKS = 12
interface Row { id?: string; name: string; start: string }
const lineStart = props.line.towns[0]!.controlPoints[0]!
const order = props.line.towns.flatMap((t) => t.controlPoints)
const byOrder = (a: Row, b: Row) => order.indexOf(a.start) - order.indexOf(b.start)
const rows = ref<Row[]>(deskSpans(props.line, props.desks).map((s, k) => ({ id: s.desk.id, name: s.desk.name, start: k ? s.desk.start : lineStart })))
if (!rows.value.length) rows.value.push({ name: 'Desk 1', start: lineStart })

// "Starts at" choices, by town: all of it, or from its second control point on, each at its milepost.
const points = new Map(props.board.points.map((p) => [p.id, p]))
const starts = computed(() => props.line.towns.map((t, k) => ({
  town: t.name,
  options: t.controlPoints.filter((cp) => cp !== lineStart).map((cp) => {
    const whole = cp === t.controlPoints[0]
    const mp = `MP ${(whole ? props.board.towns[k]!.milepost : milepostAt(props.board, points.get(cp)?.x ?? 0)).toFixed(1)}`
    return { value: cp, label: whole ? `All of ${t.name}, ${mp}` : `${points.get(cp)?.name ?? cp} on, ${mp}` }
  })
})).filter((g) => g.options.length))

// The rows as desks would place them, for the bar and each row's "Covers".
const preview = computed(() => {
  const desks: CtcDesk[] = rows.value.map((r, k) => ({
    id: r.id ?? `new-${k}`, lineId: props.line.id, name: r.name || `Desk ${k + 1}`, start: r.start,
    holder: props.desks.find((d) => d.id === r.id)?.holder ?? null, note: null
  }))
  return boardDesks(props.line, props.board, deskSpans(props.line, desks), '')
})
const covers = (k: number) => {
  const d = preview.value.find((p) => p.id === (rows.value[k]!.id ?? `new-${k}`))
  return d ? `${d.stretch}, ${deskMileposts(props.board, d).miles.toFixed(1)} mi, ${spanSidings(props.line, d.span)} sidings` : ''
}
const problem = computed(() => {
  if (rows.value.some((r) => !r.name.trim())) return 'Every desk needs a name.'
  if (new Set(rows.value.map((r) => r.name.trim().toLowerCase())).size < rows.value.length) return 'Two desks have the same name.'
  if (new Set(rows.value.map((r) => r.start)).size < rows.value.length) return 'Two desks start at the same place.'
  return ''
})
const held = computed(() => props.desks.filter((d) => d.holder && !rows.value.some((r) => r.id === d.id)))

// A new desk takes the second half of the desk with the most control points, starting at a town where it can.
function add() {
  const longest = [...preview.value].sort((a, b) => b.span.controlPoints.length - a.span.controlPoints.length)[0]
  const cps = longest?.span.controlPoints ?? []
  if (cps.length < 2) return
  const townStarts = new Set(props.line.towns.map((t) => t.controlPoints[0]))
  const half = cps.slice(Math.ceil(cps.length / 2))
  rows.value.push({ name: `Desk ${rows.value.length + 1}`, start: half.find((cp) => townStarts.has(cp)) ?? half[0]! })
  rows.value.sort((a, b) => (a === rows.value[0] ? -1 : b === rows.value[0] ? 1 : byOrder(a, b)))
}
const save = () => emit('save', rows.value.map((r) => ({ id: r.id, name: r.name.trim(), start: r.start })))
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
          handed over at a signal. Each desk runs up to where the next one starts. Dispatchers on a desk stay on it when
          it changes.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6">
        <CtcDeskStrip :board="board" :desks="preview" />
        <Table>
          <TableHeader>
            <TableRow><TableHead class="w-56">Name</TableHead><TableHead class="w-72">Starts at</TableHead><TableHead>Covers</TableHead><TableHead class="w-24" /></TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(r, k) in rows" :key="r.id ?? `new-${k}`">
              <TableCell><Input v-model="r.name" maxlength="40" :aria-label="`Desk ${k + 1}'s name`" /></TableCell>
              <TableCell>
                <span v-if="k === 0" class="text-sm">{{ line.towns[0]?.name }}, the start of the line</span>
                <select
                  v-else v-model="r.start" :aria-label="`Where ${r.name || `desk ${k + 1}`} starts`"
                  class="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs dark:bg-input/30"
                >
                  <optgroup v-for="g in starts" :key="g.town" :label="g.town">
                    <option v-for="o in g.options" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </optgroup>
                </select>
              </TableCell>
              <TableCell class="text-muted-foreground">{{ covers(k) }}</TableCell>
              <TableCell class="text-right">
                <Button v-if="k > 0" variant="ghost" size="sm" @click="rows.splice(k, 1)">Remove</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="secondary" :disabled="rows.length >= MAX_DESKS || rows.length >= order.length" @click="add">Add a desk</Button>
          <span v-if="problem" class="text-sm text-destructive">{{ problem }}</span>
          <span v-else-if="held.length" class="text-sm text-amber-700 dark:text-amber-300">
            Saving takes {{ held.map((d) => d.holder!.name).join(' and ') }} off {{ held.map((d) => d.name).join(' and ') }}, which you've removed.
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
