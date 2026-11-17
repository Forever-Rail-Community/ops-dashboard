<script setup lang="ts">
import { toast } from 'vue-sonner'

// Every report, for staff: filter by status, pick one, then set its status, reply to the reporter, link it to a
// roadmap item, or delete it.
const props = defineProps<{ reports: BugReport[]; openId?: number }>()
const emit = defineEmits<{ changed: [] }>()

const { data: roadmap } = useFetch<RoadmapItem[]>('/api/roadmap', { key: 'roadmap', default: () => [] })

const filter = ref<BugStatus | 'all'>('all')
const shown = computed(() => props.reports.filter((r) => filter.value === 'all' || r.status === filter.value))
const pickedId = ref<number | undefined>(props.openId ?? props.reports[0]?.id)
const picked = computed(() => props.reports.find((r) => r.id === pickedId.value))

const form = ref({ status: 'new' as BugStatus, reply: '', roadmapItemId: 'none' })
watch(
  picked,
  (r) => {
    if (r) form.value = { status: r.status, reply: r.reply, roadmapItemId: r.roadmapItem ? String(r.roadmapItem.id) : 'none' }
  },
  { immediate: true }
)

const busy = ref(false)
async function save() {
  if (!picked.value) return
  busy.value = true
  try {
    await $fetch(`/api/bugs/${picked.value.id}`, {
      method: 'PUT',
      body: { status: form.value.status, reply: form.value.reply, roadmapItemId: form.value.roadmapItemId === 'none' ? null : Number(form.value.roadmapItemId) }
    })
    toast.success('Saved', { description: `${picked.value.author} sees the status and reply on their report.` })
    emit('changed')
  } catch (err: any) {
    toast.error('Not saved', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

const confirmDelete = ref(false)
async function remove() {
  confirmDelete.value = false
  const id = picked.value?.id
  if (!id) return
  try {
    await $fetch(`/api/bugs/${id}`, { method: 'DELETE' })
    toast.success('Deleted')
    pickedId.value = undefined
    emit('changed')
  } catch (err: any) {
    toast.error('Not deleted', { description: err?.data?.statusMessage ?? 'Try again.' })
  }
}
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
    <div class="grid content-start gap-3">
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
        <button
          v-for="f in [{ value: 'all', label: 'All' }, ...BUG_STATUSES]"
          :key="f.value"
          class="rounded-full border px-3 py-1 text-sm"
          :class="filter === f.value ? 'bg-accent font-medium' : 'text-muted-foreground'"
          :aria-pressed="filter === f.value"
          @click="filter = f.value as BugStatus | 'all'"
        >
          {{ f.label }} <span class="text-muted-foreground">{{ f.value === 'all' ? reports.length : reports.filter((r) => r.status === f.value).length }}</span>
        </button>
      </div>
      <p v-if="!shown.length" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No reports here.</p>
      <ul class="grid gap-1">
        <li v-for="r in shown" :key="r.id">
          <button class="grid w-full gap-1 rounded-lg p-3 text-left hover:bg-accent" :class="{ 'bg-accent': r.id === pickedId }" @click="pickedId = r.id">
            <div class="flex items-start justify-between gap-3"><span class="font-medium">{{ r.title }}</span><BugsStatusTag :status="r.status" /></div>
            <span class="text-xs text-muted-foreground">#{{ r.id }} · {{ r.area }} · {{ r.author }} · {{ date(r.createdAt) }}{{ r.screenshots.length ? ` · ${r.screenshots.length} screenshot${r.screenshots.length > 1 ? 's' : ''}` : '' }}</span>
          </button>
        </li>
      </ul>
    </div>

    <Card v-if="picked" class="gap-4 self-start">
      <CardHeader>
        <CardDescription>#{{ picked.id }} · {{ picked.area }} · {{ picked.author }} · {{ date(picked.createdAt) }}</CardDescription>
        <CardTitle class="text-base">{{ picked.title }}</CardTitle>
      </CardHeader>
      <CardContent class="grid gap-4">
        <p class="text-sm whitespace-pre-line">{{ picked.body }}</p>
        <BugsScreenshots :ids="picked.screenshots" size="large" />
        <div class="grid gap-1.5">
          <Label>Status</Label>
          <Select v-model="form.status">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem v-for="s in BUG_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</SelectItem></SelectContent>
          </Select>
        </div>
        <div class="grid gap-1.5">
          <Label>Roadmap item</Label>
          <Select v-model="form.roadmapItemId">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked</SelectItem>
              <SelectItem v-for="i in roadmap" :key="i.id" :value="String(i.id)">{{ i.title }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-1.5">
          <Label for="bug-reply">Reply to {{ picked.author }}</Label>
          <Textarea id="bug-reply" v-model="form.reply" rows="3" :maxlength="BUG_LIMITS.reply" placeholder="They see this on their report" />
        </div>
        <div class="flex gap-2">
          <Button :disabled="busy" @click="save">Save</Button>
          <Button variant="ghost" class="ml-auto text-destructive" @click="confirmDelete = true">Delete</Button>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="confirmDelete">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete report #{{ picked?.id }}?</DialogTitle>
          <DialogDescription>The report and its screenshots are removed, for {{ picked?.author }} too. This can't be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="confirmDelete = false">Cancel</Button>
          <Button variant="destructive" @click="remove">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
