<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Check, ChevronsRight, Circle, Hammer, Plus } from '@lucide/vue'
import type { Component } from 'vue'

// The roadmap's four columns, each scrolling on its own. Clicking a card opens it in a side panel. Staff can add
// items to a column, and edit, move or remove them from the panel.
const props = defineProps<{ items: RoadmapItem[]; staff: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const { scope, bugFixesOnly, matchesQuery } = useRoadmapFilters()

const COLUMN_ICON: Record<RoadmapStatus, { icon: Component; cls: string }> = {
  planned: { icon: Circle, cls: 'text-muted-foreground' },
  next: { icon: ChevronsRight, cls: 'text-sky-600 dark:text-sky-300' },
  progress: { icon: Hammer, cls: 'text-amber-600 dark:text-amber-300' },
  complete: { icon: Check, cls: 'text-emerald-600 dark:text-emerald-300' }
}

const shown = (i: RoadmapItem) =>
  (scope.value === 'all' || i.scope === scope.value) && (!bugFixesOnly.value || i.bugReports > 0) && matchesQuery(`${i.title} ${i.description}`)
const columns = computed(() => ROADMAP_COLUMNS.map((col) => ({ ...col, ...COLUMN_ICON[col.value], items: props.items.filter((i) => i.status === col.value && shown(i)) })))

// The open item is looked up by id, so it shows fresh data after a vote or edit.
const openId = ref<number | null>(null)
const openItem = computed(() => props.items.find((i) => i.id === openId.value) ?? null)

const editing = ref<{ open: boolean; item: RoadmapItem | null; status: RoadmapStatus }>({ open: false, item: null, status: 'planned' })
const edit = (item: RoadmapItem | null, status: RoadmapStatus = 'planned') => (editing.value = { open: true, item, status })

async function vote(item: RoadmapItem) {
  if (item.requestId && (await voteForRequest(item.requestId, !item.voted))) emit('changed')
}

async function move(item: RoadmapItem, status: RoadmapStatus) {
  try {
    const { discord } = await $fetch<{ discord: DiscordOutcome }>(`/api/roadmap/items/${item.id}`, {
      method: 'PUT',
      body: { title: item.title, description: item.description, scope: item.scope, status, announce: true }
    })
    toast.success(`Moved to ${columnLabel(status)}`, discord === 'posted' ? { description: 'Announced on Discord.' } : undefined)
    emit('changed')
  } catch (err) {
    toast.error('Not moved', { description: errorText(err) })
  }
}

async function remove(item: RoadmapItem) {
  try {
    await $fetch(`/api/roadmap/items/${item.id}`, { method: 'DELETE' })
    toast.success('Removed from the roadmap')
    openId.value = null
    emit('changed')
  } catch (err) {
    toast.error('Not removed', { description: errorText(err) })
  }
}
</script>

<template>
  <div class="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
    <section v-for="col in columns" :key="col.value" :aria-label="col.label" class="flex min-w-0 flex-col gap-3.5">
      <header class="px-1">
        <div class="flex items-center gap-2">
          <component :is="col.icon" class="size-[17px]" :class="col.cls" />
          <h2 class="text-base font-semibold">{{ col.label }}</h2>
          <span class="text-[13px] text-muted-foreground tabular-nums">{{ col.items.length }}</span>
          <Button v-if="staff" variant="ghost" size="icon" class="ml-auto size-7" :aria-label="`Add to ${col.label}`" @click="edit(null, col.value)"><Plus /></Button>
        </div>
        <p class="mt-1 text-[13px] text-muted-foreground">{{ col.hint }}</p>
      </header>
      <div class="grid min-h-24 gap-2.5 pr-0.5 [scrollbar-width:thin] md:max-h-[calc(100svh-15rem)] md:overflow-y-auto md:overscroll-contain">
        <RoadmapItemCard v-for="item in col.items" :key="item.id" :item="item" @open="openId = item.id" @vote="vote(item)" />
        <p v-if="!col.items.length" class="rounded-[14px] border border-dashed p-4 text-center text-[13px] text-muted-foreground">Nothing here.</p>
      </div>
    </section>

    <RoadmapItemPanel
      :item="openItem" :staff="staff" @close="openId = null" @vote="openItem && vote(openItem)"
      @edit="openItem && edit(openItem)" @move="(status) => openItem && move(openItem, status)" @remove="openItem && remove(openItem)" @changed="emit('changed')"
    />
    <RoadmapItemDialog v-model:open="editing.open" :item="editing.item" :status="editing.status" @saved="emit('changed')" />
  </div>
</template>
