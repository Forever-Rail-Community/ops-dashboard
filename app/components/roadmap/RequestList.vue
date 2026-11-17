<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ChevronUp, EyeOff, MoreHorizontal, Search } from '@lucide/vue'
import type { DialogAction } from './RequestActionDialog.vue'

// Feature requests with votes. Staff can accept (onto the roadmap), decline, merge, reply, hide or reopen.
const props = defineProps<{ requests: FeatureRequest[]; staff: boolean; scope: RoadmapScope | 'all' }>()
const emit = defineEmits<{ changed: [] }>()

const query = ref('')
const sort = ref<'votes' | 'new'>('votes')
const STATUS_TAG: Partial<Record<RequestStatus, { label: string; cls: string }>> = {
  accepted: { label: 'On the roadmap', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  declined: { label: 'Declined', cls: 'bg-muted text-muted-foreground' }
}

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.requests
    .filter((r) => (props.scope === 'all' || r.scope === props.scope) && (!q || `${r.title} ${r.body}`.toLowerCase().includes(q)))
    .sort((a, b) =>
      // Declined requests sink to the bottom either way.
      Number(a.status === 'declined') - Number(b.status === 'declined') ||
      (sort.value === 'votes' ? b.votes - a.votes : 0) ||
      b.createdAt.localeCompare(a.createdAt)
    )
})

const pending = ref(new Set<number>())
async function vote(r: FeatureRequest) {
  pending.value.add(r.id)
  try {
    await $fetch(`/api/requests/${r.id}/vote`, { method: 'POST', body: { vote: !r.voted } })
    emit('changed')
  } catch (err) {
    toast.error('Vote not saved', { description: errorText(err) })
  } finally {
    pending.value.delete(r.id)
  }
}

async function act(r: FeatureRequest, body: Record<string, unknown>, done: string) {
  try {
    await $fetch(`/api/requests/${r.id}`, { method: 'POST', body })
    toast.success(done)
    emit('changed')
  } catch (err) {
    toast.error('Not saved', { description: errorText(err) })
  }
}

const dialog = ref<{ open: boolean; request: FeatureRequest | null; action: DialogAction }>({ open: false, request: null, action: 'reply' })
const openDialog = (request: FeatureRequest, action: DialogAction) => (dialog.value = { open: true, request, action })
const canVote = (r: FeatureRequest) => r.status === 'open' || r.status === 'accepted'
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative w-full max-w-xs">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="query" class="pl-9" placeholder="Find a request" aria-label="Find a request" />
      </div>
      <div class="ml-auto flex rounded-md border p-0.5 text-sm" role="group" aria-label="Sort">
        <button class="rounded px-2.5 py-1" :class="sort === 'votes' ? 'bg-accent font-medium' : 'text-muted-foreground'" :aria-pressed="sort === 'votes'" @click="sort = 'votes'">Most wanted</button>
        <button class="rounded px-2.5 py-1" :class="sort === 'new' ? 'bg-accent font-medium' : 'text-muted-foreground'" :aria-pressed="sort === 'new'" @click="sort = 'new'">Newest</button>
      </div>
    </div>

    <p v-if="!requests.length" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No requests yet. Be the first to suggest something.</p>
    <p v-else-if="!shown.length" class="px-1 text-sm text-muted-foreground">No request matches.</p>

    <ul class="grid gap-2">
      <li v-for="r in shown" :key="r.id" class="flex gap-4 rounded-xl border bg-card p-4" :class="{ 'opacity-70': r.status === 'declined' || r.hidden }">
        <button
          class="flex h-14 w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold disabled:opacity-60"
          :class="r.voted ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent'"
          :disabled="!canVote(r) || pending.has(r.id)"
          :aria-pressed="r.voted"
          :aria-label="`${r.voted ? 'Take back your vote for' : 'Vote for'} ${r.title}, ${r.votes} ${r.votes === 1 ? 'vote' : 'votes'}`"
          @click="vote(r)"
        >
          <ChevronUp class="size-4" />{{ r.votes }}
        </button>
        <div class="grid min-w-0 flex-1 gap-1">
          <div class="flex items-start justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <p class="font-medium">{{ r.title }}</p>
              <span v-if="STATUS_TAG[r.status]" class="rounded-full px-2 py-0.5 text-xs" :class="STATUS_TAG[r.status]!.cls">{{ STATUS_TAG[r.status]!.label }}</span>
              <span v-if="r.hidden" class="flex items-center gap-1 text-xs text-muted-foreground"><EyeOff class="size-3.5" />Hidden</span>
            </div>
            <DropdownMenu v-if="staff">
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="-mt-1 -mr-1 size-7 shrink-0" :aria-label="`Actions for ${r.title}`"><MoreHorizontal /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem v-if="r.status === 'open'" @select="act(r, { action: 'accept' }, 'Added to the roadmap as Planned')">Accept onto the roadmap</DropdownMenuItem>
                <DropdownMenuItem v-if="r.status === 'open'" @select="openDialog(r, 'decline')">Decline…</DropdownMenuItem>
                <DropdownMenuItem v-if="r.status === 'open'" @select="openDialog(r, 'merge')">Merge into…</DropdownMenuItem>
                <DropdownMenuItem v-if="r.status === 'declined'" @select="act(r, { action: 'reopen' }, 'Reopened')">Reopen</DropdownMenuItem>
                <DropdownMenuItem @select="openDialog(r, 'reply')">{{ r.reply ? 'Edit reply…' : 'Reply…' }}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem @select="act(r, { action: 'hide', hidden: !r.hidden }, r.hidden ? 'Shown again' : 'Hidden from members')">{{ r.hidden ? 'Show to members' : 'Hide from members' }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p v-if="r.body" class="text-sm whitespace-pre-line text-muted-foreground">{{ r.body }}</p>
          <p v-if="r.reply" class="rounded-lg bg-muted p-2.5 text-sm"><span class="font-medium">Staff:</span> {{ r.reply }}</p>
          <div class="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <RoadmapScopeTag :scope="r.scope" />
            <span>{{ r.mine ? 'You' : r.author }} · {{ shortDate(r.createdAt) }}</span>
          </div>
        </div>
      </li>
    </ul>

    <RoadmapRequestActionDialog v-model:open="dialog.open" :request="dialog.request" :action="dialog.action" :requests="requests" @done="emit('changed')" />
  </div>
</template>
