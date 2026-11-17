<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowDown, ArrowUp, Plus, Send, Trash2, X } from '@lucide/vue'

// Writing What's new updates: drafts until published; publishing can also post to Discord. Needs "updates.post".
definePageMeta({ title: "What's new" })

interface Manage {
  updates: Update[]
  discord: boolean
  areas: string[]
  completed: RoadmapItem[] // complete roadmap items not yet in a published update
}
const { data, refresh } = await useFetch<Manage>('/api/updates/manage', { default: () => ({ updates: [], discord: false, areas: [], completed: [] }) })

const selectedId = ref<number | 'new' | null>(data.value.updates[0]?.id ?? 'new')
const selected = computed(() => data.value.updates.find((u) => u.id === selectedId.value))
const blank = () => ({ title: '', changes: [{ area: data.value.areas[0] ?? '', text: '' }], roadmapItemIds: [] as number[] })
const draft = ref<{ title: string; changes: UpdateChange[]; roadmapItemIds: number[] }>(blank())
const toDiscord = ref(true)
const busy = ref(false)
const confirmDelete = ref(false)

watch(
  selected,
  (u) => {
    draft.value = u ? { title: u.title, changes: u.changes.map((c) => ({ ...c })), roadmapItemIds: [...u.roadmapItemIds] } : blank()
  },
  { immediate: true }
)

const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not published')

// What Discord did, in words; nothing to say when nothing happened there.
const DISCORD_SAID: Partial<Record<DiscordOutcome, string>> = {
  posted: 'Posted to Discord.',
  updated: 'The Discord post was updated too.',
  removed: 'The Discord post was removed too.',
  failed: "Discord didn't accept it; check the webhook in Vercel."
}

// Runs a save, then refreshes the list and says how it went; `done` null says nothing on success (a step of a bigger action).
async function run<T extends { update: Update; discord: DiscordOutcome } | Update>(action: () => Promise<T>, done: string | null) {
  busy.value = true
  try {
    const result = await action()
    await refresh()
    const discord = 'discord' in result ? DISCORD_SAID[result.discord] : undefined
    const update = 'update' in result ? result.update : result
    if (done && discord && 'discord' in result && result.discord === 'failed') toast.warning(done, { description: discord })
    else if (done) toast.success(done, discord ? { description: discord } : undefined)
    return update
  } catch (err: any) {
    toast.error('Not saved', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

async function save() {
  if (selected.value) {
    await run(() => $fetch<{ update: Update; discord: DiscordOutcome }>(`/api/updates/${selected.value!.id}`, { method: 'PUT', body: draft.value }), 'Saved')
  } else {
    const created = await run(() => $fetch<Update>('/api/updates', { method: 'POST', body: draft.value }), 'Draft saved')
    if (created) selectedId.value = created.id
  }
}

async function publish() {
  if (!selected.value) {
    const created = await run(() => $fetch<Update>('/api/updates', { method: 'POST', body: draft.value }), null)
    if (!created) return
    selectedId.value = created.id
  } else {
    // Publish what's on screen, not an older saved copy.
    const saved = await run(() => $fetch<{ update: Update; discord: DiscordOutcome }>(`/api/updates/${selected.value!.id}`, { method: 'PUT', body: draft.value }), null)
    if (!saved) return
  }
  await run(
    () => $fetch<{ update: Update; discord: DiscordOutcome }>(`/api/updates/${selectedId.value}/publish`, { method: 'POST', body: { discord: data.value.discord && toDiscord.value } }),
    'Published'
  )
}

async function remove() {
  confirmDelete.value = false
  const id = selected.value?.id
  if (!id) return
  await run(() => $fetch<{ update: Update; discord: DiscordOutcome }>(`/api/updates/${id}`, { method: 'DELETE' }), 'Deleted')
  selectedId.value = data.value.updates[0]?.id ?? 'new'
}

function move(i: number, by: -1 | 1) {
  const list = draft.value.changes
  const j = i + by
  if (j < 0 || j >= list.length) return
  ;[list[i], list[j]] = [list[j]!, list[i]!]
}
const addChange = () => draft.value.changes.push({ area: draft.value.changes.at(-1)?.area ?? data.value.areas[0] ?? '', text: '' })

// Completed roadmap items: add one as a change, and publishing marks it as shipped in this update.
const AREA_FOR: Record<RoadmapScope, string> = { run8: 'Run8', railroader: 'Railroader', dashboard: 'Dashboard' }
const linked = computed(() => data.value.completed.filter((i) => draft.value.roadmapItemIds.includes(i.id)))
const offered = computed(() => data.value.completed.filter((i) => !draft.value.roadmapItemIds.includes(i.id)))
function addFromRoadmap(item: RoadmapItem) {
  const empty = draft.value.changes.length === 1 && !draft.value.changes[0]!.text.trim()
  const change = { area: AREA_FOR[item.scope], text: item.title }
  if (empty) draft.value.changes = [change]
  else draft.value.changes.push(change)
  draft.value.roadmapItemIds.push(item.id)
}
const unlink = (id: number) => (draft.value.roadmapItemIds = draft.value.roadmapItemIds.filter((x) => x !== id))

const canSave = computed(() => draft.value.title.trim() && draft.value.changes.every((c) => c.text.trim()))
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight">What's new</h2>
      <p class="text-sm text-muted-foreground">
        Updates everyone sees the next time they sign in after you publish.
        {{ data.discord ? 'Publishing can also post them to Discord.' : 'Posting to Discord is off: set NUXT_DISCORD_UPDATES_WEBHOOK in Vercel to turn it on.' }}
      </p>
    </div>

    <div class="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_320px]">
      <section class="grid content-start gap-2" aria-label="Updates">
        <Button variant="outline" class="justify-start" @click="selectedId = 'new'"><Plus />New update</Button>
        <ul class="grid gap-1">
          <li v-if="selectedId === 'new'">
            <div class="grid gap-0.5 rounded-lg bg-accent p-2.5 text-sm font-medium">{{ draft.title || 'Untitled' }}<span class="text-xs font-normal text-muted-foreground">New, not saved</span></div>
          </li>
          <li v-for="u in data.updates" :key="u.id">
            <button class="grid w-full gap-0.5 rounded-lg p-2.5 text-left hover:bg-accent" :class="{ 'bg-accent': u.id === selectedId }" @click="selectedId = u.id">
              <span class="text-sm font-medium">{{ u.title }}</span>
              <span class="text-xs" :class="u.publishedAt ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'">
                {{ u.publishedAt ? `Published ${formatDate(u.publishedAt)}` : 'Draft' }}{{ u.onDiscord ? ' · on Discord' : '' }}
              </span>
            </button>
          </li>
        </ul>
      </section>

      <Card class="gap-4">
        <CardHeader>
          <CardTitle class="text-base">{{ selected?.publishedAt ? 'Edit published update' : selected ? 'Edit draft' : 'New update' }}</CardTitle>
          <CardDescription v-if="selected?.publishedAt">
            Saving changes it for everyone{{ selected.onDiscord ? ' and edits the Discord post' : '' }}.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="grid gap-1.5">
            <Label for="update-title">Title</Label>
            <Input id="update-title" v-model="draft.title" :maxlength="UPDATE_LIMITS.title" placeholder="e.g. Grade panel, units and status" />
          </div>
          <div class="grid gap-2">
            <Label>Changes</Label>
            <div v-for="(change, i) in draft.changes" :key="i" class="grid grid-cols-[190px_minmax(0,1fr)_auto] items-start gap-2">
              <Select v-model="change.area">
                <SelectTrigger class="w-full" :aria-label="`Change ${i + 1}: area`"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem v-for="a in data.areas" :key="a" :value="a">{{ a }}</SelectItem></SelectContent>
              </Select>
              <Textarea v-model="change.text" rows="2" :maxlength="UPDATE_LIMITS.text" :aria-label="`Change ${i + 1}`" placeholder="What changed, in a sentence" />
              <div class="flex flex-col">
                <Button variant="ghost" size="icon" class="size-7" :disabled="i === 0" aria-label="Move up" @click="move(i, -1)"><ArrowUp /></Button>
                <Button variant="ghost" size="icon" class="size-7" :disabled="i === draft.changes.length - 1" aria-label="Move down" @click="move(i, 1)"><ArrowDown /></Button>
                <Button variant="ghost" size="icon" class="size-7" :disabled="draft.changes.length === 1" aria-label="Remove this change" @click="draft.changes.splice(i, 1)"><Trash2 /></Button>
              </div>
            </div>
            <Button v-if="draft.changes.length < UPDATE_LIMITS.changes" variant="ghost" size="sm" class="justify-self-start" @click="addChange"><Plus />Add a change</Button>
          </div>
          <div v-if="offered.length || linked.length" class="grid gap-2 rounded-lg border border-dashed p-3">
            <p class="text-sm font-medium">From the roadmap</p>
            <p class="text-xs text-muted-foreground">Completed items not yet in an update. Adding one adds it as a change; publishing marks it as shipped in this update.</p>
            <div class="flex flex-wrap gap-1.5">
              <button v-for="i in offered" :key="i.id" class="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:bg-accent" @click="addFromRoadmap(i)"><Plus class="size-3" />{{ i.title }}</button>
              <span v-for="i in linked" :key="i.id" class="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs">
                Ships: {{ i.title }}
                <button class="-mr-1 rounded-full p-0.5 hover:bg-background" :aria-label="`Don't mark ${i.title} as shipped in this update`" @click="unlink(i.id)"><X class="size-3" /></button>
              </span>
            </div>
          </div>
          <label v-if="!selected?.publishedAt" class="flex items-center gap-2 text-sm" :class="{ 'text-muted-foreground': !data.discord }">
            <Checkbox v-model="toDiscord" :disabled="!data.discord" />
            Also post to Discord{{ data.discord ? '' : ' (not set up)' }}
          </label>
          <div class="flex flex-wrap gap-2">
            <Button v-if="!selected?.publishedAt" :disabled="busy || !canSave" @click="publish"><Send />Publish</Button>
            <Button :variant="selected?.publishedAt ? 'default' : 'outline'" :disabled="busy || !canSave" @click="save">{{ selected?.publishedAt ? 'Save changes' : 'Save draft' }}</Button>
            <Button v-if="selected" variant="ghost" class="ml-auto text-destructive" :disabled="busy" @click="confirmDelete = true">Delete</Button>
          </div>
        </CardContent>
      </Card>

      <section class="grid content-start gap-2" aria-label="Preview">
        <h3 class="text-sm font-medium text-muted-foreground">What members see</h3>
        <div class="grid gap-2 rounded-xl border p-4">
          <p class="font-medium">{{ draft.title || 'Untitled' }}</p>
          <UpdatesUpdateChanges :changes="draft.changes.filter((c) => c.text.trim())" />
        </div>
        <p v-if="data.discord" class="text-xs text-muted-foreground">On Discord it's posted as "What's new: {{ draft.title || 'Untitled' }}", with each change under its area and a link to the dashboard.</p>
      </section>
    </div>

    <Dialog v-model:open="confirmDelete">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete "{{ selected?.title }}"?</DialogTitle>
          <DialogDescription>
            {{ selected?.publishedAt ? 'Members will no longer see it.' : 'The draft is removed.' }}
            {{ selected?.onDiscord ? 'Its Discord post is deleted too.' : '' }} This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmDelete = false">Cancel</Button>
          <Button variant="destructive" @click="remove">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
