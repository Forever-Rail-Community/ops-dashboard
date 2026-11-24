<script setup lang="ts">
import { Check, ChevronUp, Pencil, Trash2 } from '@lucide/vue'

// A roadmap item opened from the board: the whole description, votes, its progress and comments. Staff can edit,
// move and remove it here.
const props = defineProps<{ item: RoadmapItem | null; staff: boolean }>()
const emit = defineEmits<{ close: []; vote: []; edit: []; move: [status: RoadmapStatus]; remove: []; changed: [] }>()

const STATUS_TONE: Record<RoadmapStatus, PillTone> = { planned: 'gray', next: 'blue', progress: 'amber', complete: 'green' }
const DOT: Record<RoadmapStatus, string> = { planned: 'bg-muted-foreground', next: 'bg-sky-500', progress: 'bg-amber-400', complete: 'bg-emerald-500' }

// Newest first: each column it's been in, then who suggested it.
const progress = computed(() => {
  const i = props.item
  if (!i) return []
  const steps = [...i.history].reverse().map((h) => ({ text: columnLabel(h.status), at: h.at, dot: DOT[h.status] }))
  if (i.requestedBy && i.requestedAt) steps.push({ text: `Suggested by ${i.requestedBy}`, at: i.requestedAt, dot: 'bg-muted' })
  return steps
})
const confirmRemove = ref(false)
watch(() => props.item?.id, () => (confirmRemove.value = false))
</script>

<template>
  <Sheet :open="Boolean(item)" @update:open="(v) => !v && emit('close')">
    <SheetContent class="w-full gap-0 overflow-y-auto sm:max-w-[520px]" @open-auto-focus.prevent>
      <template v-if="item">
        <SheetHeader class="gap-3 px-7 pt-7 pb-2">
          <div class="flex flex-wrap items-center gap-2.5 pr-8">
            <PagePill :tone="STATUS_TONE[item.status]">{{ columnLabel(item.status) }}</PagePill>
            <PagePill v-if="item.bugReports" tone="red">Bug fix</PagePill>
            <RoadmapScopeTag :scope="item.scope" />
          </div>
          <SheetTitle class="text-2xl leading-tight font-semibold">{{ item.title }}</SheetTitle>
          <SheetDescription class="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">
            {{ item.description || 'No description yet.' }}
          </SheetDescription>
        </SheetHeader>

        <div class="flex flex-col gap-6 px-7 pt-4 pb-7">
          <div v-if="item.requestId" class="flex items-center gap-3 rounded-xl border bg-background px-4 py-3.5">
            <Button
              :variant="item.voted ? 'outline' : 'default'" :disabled="item.status === 'complete'" :aria-pressed="item.voted"
              :class="item.voted ? 'border-sky-500/45 bg-sky-500/15 text-sky-700 dark:text-sky-200' : ''" @click="emit('vote')"
            >
              <Check v-if="item.voted" /><ChevronUp v-else />{{ item.voted ? 'Voted' : 'Vote' }}
            </Button>
            <span class="text-sm"><b class="tabular-nums">{{ item.votes }}</b> <span class="text-muted-foreground">{{ item.votes === 1 ? 'member wants' : 'members want' }} this</span></span>
          </div>
          <p v-else-if="item.bugReports" class="rounded-xl border bg-background px-4 py-3.5 text-sm">
            Reported by <b>{{ item.bugReports }}</b> {{ item.bugReports === 1 ? 'member' : 'members' }}, and confirmed by staff.
          </p>

          <div>
            <h3 class="mb-2.5 text-sm font-semibold">Progress</h3>
            <ol class="grid gap-2.5">
              <li v-for="(step, i) in progress" :key="i" class="flex items-center gap-2.5 text-[13px]">
                <span class="size-2 shrink-0 rounded-full" :class="step.dot" />{{ step.text }}
                <span class="ml-auto text-muted-foreground">{{ shortDate(step.at) }}</span>
              </li>
            </ol>
            <p v-if="item.shippedIn" class="mt-3 text-[13px] text-muted-foreground">
              Shipped in “{{ item.shippedIn.title }}”. See What’s new for what changed.
            </p>
          </div>

          <RoadmapComments :key="item.id" :item-id="item.id" :staff="staff" @changed="emit('changed')" />

          <div v-if="staff" class="grid gap-3 border-t pt-5">
            <h3 class="text-sm font-semibold">Manage</h3>
            <div class="flex flex-wrap items-center gap-2">
              <Select :model-value="item.status" @update:model-value="(v) => v !== item!.status && emit('move', v as RoadmapStatus)">
                <SelectTrigger class="w-44" aria-label="Column"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem v-for="c in ROADMAP_COLUMNS" :key="c.value" :value="c.value">{{ c.label }}</SelectItem></SelectContent>
              </Select>
              <Button variant="outline" @click="emit('edit')"><Pencil />Edit</Button>
              <Button v-if="!confirmRemove" variant="ghost" class="text-destructive" @click="confirmRemove = true"><Trash2 />Remove</Button>
              <Button v-else variant="destructive" @click="emit('remove')">Remove from the roadmap</Button>
            </div>
            <p class="text-xs text-muted-foreground">Moving it to another column is announced on Discord. Removing it opens the feature request it came from again.</p>
          </div>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
