<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ChevronUp, MoreHorizontal, Plus } from '@lucide/vue'

// The roadmap's three columns. Staff can add, edit, move and remove items.
const props = defineProps<{ items: RoadmapItem[]; staff: boolean; scope: RoadmapScope | 'all' }>()
const emit = defineEmits<{ changed: [] }>()

// Complete fills up over time: show the latest, and more on request.
const COMPLETE_SHOWN = 8
const showAllComplete = ref(false)

const columns = computed(() =>
  ROADMAP_COLUMNS.map((col) => {
    const all = props.items.filter((i) => i.status === col.value && (props.scope === 'all' || i.scope === props.scope))
    const shown = col.value === 'complete' && !showAllComplete.value ? all.slice(0, COMPLETE_SHOWN) : all
    return { ...col, all, shown }
  })
)

const editing = ref<RoadmapItem | null>(null)
const addTo = ref<RoadmapStatus>('planned')
const dialogOpen = ref(false)
const edit = (item: RoadmapItem | null, status: RoadmapStatus = 'planned') => {
  editing.value = item
  addTo.value = status
  dialogOpen.value = true
}

async function move(item: RoadmapItem, status: RoadmapStatus) {
  try {
    const { discord } = await $fetch<{ discord: DiscordOutcome }>(`/api/roadmap/items/${item.id}`, {
      method: 'PUT',
      body: { title: item.title, description: item.description, scope: item.scope, status, announce: true }
    })
    toast.success(`Moved to ${ROADMAP_COLUMNS.find((c) => c.value === status)!.label}`, discord === 'posted' ? { description: 'Announced on Discord.' } : undefined)
    emit('changed')
  } catch (err) {
    toast.error('Not moved', { description: errorText(err) })
  }
}

const removing = ref<RoadmapItem | null>(null)
async function remove() {
  const item = removing.value
  removing.value = null
  if (!item) return
  try {
    await $fetch(`/api/roadmap/items/${item.id}`, { method: 'DELETE' })
    toast.success('Removed from the roadmap')
    emit('changed')
  } catch (err) {
    toast.error('Not removed', { description: errorText(err) })
  }
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <section v-for="col in columns" :key="col.value" class="flex flex-col gap-3 rounded-xl bg-muted/50 p-3" :aria-label="col.label">
      <header class="flex items-center justify-between gap-2 px-1">
        <h3 class="font-medium">{{ col.label }} <span class="text-muted-foreground">{{ col.all.length }}</span></h3>
        <div class="flex items-center gap-1">
          <span class="text-xs text-muted-foreground">{{ col.hint }}</span>
          <Button v-if="staff" variant="ghost" size="icon" class="size-7" :aria-label="`Add to ${col.label}`" @click="edit(null, col.value)"><Plus /></Button>
        </div>
      </header>
      <p v-if="!col.all.length" class="px-1 pb-2 text-sm text-muted-foreground">Nothing here yet.</p>
      <article v-for="item in col.shown" :key="item.id" class="grid gap-2 rounded-lg border bg-card p-3 shadow-xs">
        <div class="flex items-start justify-between gap-2">
          <p class="font-medium leading-snug">{{ item.title }}</p>
          <DropdownMenu v-if="staff">
            <DropdownMenuTrigger as-child>
              <Button variant="ghost" size="icon" class="-mt-1 -mr-1 size-7 shrink-0" :aria-label="`Actions for ${item.title}`"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem v-for="c in ROADMAP_COLUMNS.filter((c) => c.value !== item.status)" :key="c.value" @select="move(item, c.value)">Move to {{ c.label }}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem @select="edit(item)">Edit</DropdownMenuItem>
              <DropdownMenuItem class="text-destructive" @select="removing = item">Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p v-if="item.description" class="line-clamp-3 text-sm text-muted-foreground">{{ item.description }}</p>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <RoadmapScopeTag :scope="item.scope" />
          <span v-if="item.bugFix" class="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">Bug fix</span>
          <span v-if="item.votes" class="flex items-center gap-0.5 text-muted-foreground"><ChevronUp class="size-3.5" />{{ item.votes }}</span>
          <span v-if="item.requestedBy" class="text-muted-foreground">Requested by {{ item.requestedBy }}</span>
        </div>
        <p v-if="item.shippedIn" class="text-xs text-muted-foreground">Shipped {{ shortDate(item.shippedIn.publishedAt) }} in “{{ item.shippedIn.title }}”</p>
      </article>
      <Button v-if="col.value === 'complete' && col.all.length > COMPLETE_SHOWN" variant="ghost" size="sm" @click="showAllComplete = !showAllComplete">
        {{ showAllComplete ? 'Show fewer' : `Show ${col.all.length - COMPLETE_SHOWN} older` }}
      </Button>
    </section>

    <RoadmapItemDialog v-model:open="dialogOpen" :item="editing" :status="addTo" @saved="emit('changed')" />
    <Dialog :open="Boolean(removing)" @update:open="(v) => !v && (removing = null)">
      <DialogContent class="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove “{{ removing?.title }}”?</DialogTitle>
          <DialogDescription>It leaves the roadmap. If it came from a feature request, that request opens again with its votes.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" @click="removing = null">Cancel</Button>
          <Button variant="destructive" @click="remove">Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
