<script setup lang="ts">
// The CTC board's lines. Each is filled in from the game: which towns, in what order, each town's main and siding.
// Staff give the line a name, and can rename towns, set real mileposts, and swap a town's main and siding where the
// game's data couldn't settle which is which.
import { ArrowLeftRight, CircleAlert, Pencil, RefreshCw, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const { data: lines, refresh } = await useFetch<CtcLine[]>('/api/railroader/ctc/lines', { key: 'admin-ctc-lines' })
const fromGame = ref<CtcLineData[] | null>(null)
const loadingGame = ref(false)
const busy = ref(false)

// The line being set up or changed; `saved` is its id once saved.
const editing = ref<{ id: string; name: string; saved: boolean; data: CtcLineData } | null>(null)

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
const span = (data: CtcLineData) => `${data.towns[0]?.name} to ${data.towns.at(-1)?.name}`
const unsure = (data: CtcLineData) => data.towns.filter((t) => !t.mainCertain).length
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value))
const sameTown = (a: CtcTown, b: CtcTown) => [...a.controlPoints].sort().join() === [...b.controlPoints].sort().join()

async function loadFromGame() {
  loadingGame.value = true
  try {
    fromGame.value = await $fetch<CtcLineData[]>('/api/railroader/ctc/from-game')
  } catch (err: any) {
    toast.error("Couldn't read the game's layout", { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    loadingGame.value = false
  }
}

function setUp(data: CtcLineData) {
  const name = span(data)
  editing.value = { id: slug(name), name, saved: false, data: copy(data) }
}

function edit(line: CtcLine) {
  editing.value = { id: line.id, name: line.name, saved: true, data: copy({ towns: line.towns, links: line.links }) }
}

// Fills the line in from the game again (after track or signals change), keeping the names and mileposts staff
// gave its towns.
async function updateFromGame() {
  const current = editing.value
  if (!current) return
  await loadFromGame()
  const match = fromGame.value?.find((data) => data.towns.some((t) => current.data.towns.some((c) => sameTown(t, c))))
  if (!match) {
    toast.error("The game's layout doesn't have this line now")
    return
  }
  const fresh = copy(match)
  for (const town of fresh.towns) {
    const before = current.data.towns.find((c) => sameTown(town, c))
    if (!before) continue
    town.name = before.name
    if (before.milepost !== undefined) town.milepost = before.milepost
  }
  current.data = fresh
  toast.success('Filled in from the game again', { description: 'Town names and mileposts were kept. Save to keep the rest.' })
}

function swapMain(town: CtcTown) {
  const siding = town.sidings[0]
  if (!siding) return
  town.sidings[0] = town.main
  town.main = siding
  town.mainCertain = true
}

function setMilepost(town: CtcTown, value: string | number) {
  const n = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isFinite(n)) town.milepost = n
  else delete town.milepost
}

async function save() {
  const e = editing.value
  if (!e) return
  busy.value = true
  try {
    await $fetch(`/api/railroader/ctc/lines/${e.id}`, { method: 'PUT', body: { name: e.name, ...e.data } })
    toast.success('Line saved')
    editing.value = null
    await refresh()
  } catch (err: any) {
    toast.error('That did not work', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

async function remove(line: CtcLine) {
  if (!confirm(`Remove "${line.name}"? It disappears from the CTC board. You can set it up again from the game.`)) return
  try {
    await $fetch(`/api/railroader/ctc/lines/${line.id}`, { method: 'DELETE' })
    toast.success('Line removed')
  } catch (err: any) {
    toast.error('That did not work', { description: err?.data?.statusMessage ?? 'Try again.' })
  }
  await refresh()
}
</script>

<template>
  <div class="grid gap-6">
    <Card v-if="editing">
      <CardHeader>
        <CardTitle>{{ editing.saved ? 'Change a line' : 'Set up a line' }}</CardTitle>
        <CardDescription>
          Towns are in the order the board shows them, left to right. Mileposts are optional: without one, the board shows the distance measured along the track.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-5">
        <div class="flex flex-wrap items-end gap-3">
          <div class="grid gap-1.5">
            <Label for="line-name">Name</Label>
            <Input id="line-name" v-model="editing.name" class="w-72" maxlength="80" @update:model-value="(v) => !editing!.saved && (editing!.id = slug(String(v)))" />
          </div>
          <p class="pb-2 text-xs text-muted-foreground">Id: {{ editing.id || '…' }}</p>
          <Button variant="outline" class="ml-auto" :disabled="loadingGame" @click="updateFromGame"><RefreshCw /> Fill in from the game again</Button>
        </div>

        <Alert v-if="unsure(editing.data)">
          <CircleAlert />
          <AlertTitle>Check which track is the main at {{ unsure(editing.data) === 1 ? 'one town' : `${unsure(editing.data)} towns` }}</AlertTitle>
          <AlertDescription>The game's data didn't settle it there (marked below). Swap the main and siding where it's wrong.</AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Town</TableHead>
              <TableHead>Control points</TableHead>
              <TableHead>Main</TableHead>
              <TableHead>Siding</TableHead>
              <TableHead class="w-32">Milepost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="town in editing.data.towns" :key="town.controlPoints.join()">
              <TableCell><Input v-model="town.name" class="h-8 w-48" maxlength="60" :aria-label="`Name for ${town.controlPoints.join(', ')}`" /></TableCell>
              <TableCell class="font-mono text-xs">{{ town.controlPoints.join(', ') }}</TableCell>
              <TableCell class="font-mono text-xs">
                {{ town.main.join(' + ') || '–' }}
                <span v-if="!town.mainCertain" class="ml-1 font-sans text-amber-700 dark:text-amber-400">check</span>
              </TableCell>
              <TableCell class="font-mono text-xs">
                <span>{{ town.sidings[0]?.join(' + ') || '–' }}</span>
                <Button v-if="town.sidings[0]" variant="ghost" size="sm" class="ml-1 h-7" :aria-label="`Swap main and siding at ${town.name}`" @click="swapMain(town)">
                  <ArrowLeftRight /> Swap
                </Button>
              </TableCell>
              <TableCell>
                <Input type="number" step="0.1" min="0" class="h-8 w-24" :model-value="town.milepost" placeholder="Measured" :aria-label="`Milepost for ${town.name}`" @update:model-value="(v) => setMilepost(town, v)" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div class="flex gap-2">
          <Button :disabled="busy || !editing.id || !editing.name.trim()" @click="save">Save line</Button>
          <Button variant="ghost" @click="editing = null">Cancel</Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>CTC lines</CardTitle>
        <CardDescription>The lines the CTC board shows. Each is filled in from the game's signals and track, so a new route only needs a name.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6">
        <p v-if="!lines?.length" class="text-sm text-muted-foreground">No lines yet. Fill one in from the game below.</p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Line</TableHead>
              <TableHead>Towns</TableHead>
              <TableHead>Set up by</TableHead>
              <TableHead class="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="line in lines" :key="line.id">
              <TableCell class="font-medium">{{ line.name }}</TableCell>
              <TableCell>{{ line.towns.length }}, {{ span(line) }}</TableCell>
              <TableCell>{{ line.updatedBy }}</TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="icon" :aria-label="`Change ${line.name}`" @click="edit(line)"><Pencil /></Button>
                <Button variant="ghost" size="icon" :aria-label="`Remove ${line.name}`" @click="remove(line)"><Trash2 /></Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div class="grid gap-3">
          <div class="flex flex-wrap items-center gap-3">
            <Button variant="outline" :disabled="loadingGame" @click="loadFromGame"><RefreshCw /> Read the lines from the game</Button>
            <p class="text-sm text-muted-foreground">Uses the layout the game server last sent. The game server needs agent 0.15 and host mod 0.7.0 or later.</p>
          </div>
          <p v-if="fromGame && !fromGame.length" class="text-sm text-muted-foreground">The game's layout has no control points yet.</p>
          <ul v-else-if="fromGame" class="grid gap-2">
            <li v-for="(data, k) in fromGame" :key="k" class="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
              <span class="font-medium">{{ span(data) }}</span>
              <span class="text-muted-foreground">{{ data.towns.length }} towns</span>
              <span v-if="unsure(data)" class="text-amber-700 dark:text-amber-400">{{ unsure(data) }} to check</span>
              <span v-if="lines?.some((l) => l.towns.some((t) => data.towns.some((d) => sameTown(t, d))))" class="text-muted-foreground">Already set up</span>
              <Button size="sm" class="ml-auto" @click="setUp(data)">Set up</Button>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
