<script setup lang="ts">
import { toast } from 'vue-sonner'
import { EyeOff, MoreHorizontal } from '@lucide/vue'
import type { DialogAction } from './RequestActionDialog.vue'

// Feature requests with votes. Staff can accept (onto the roadmap), decline, merge, reply, hide or reopen.
const props = defineProps<{ requests: FeatureRequest[]; staff: boolean }>()
const emit = defineEmits<{ changed: [] }>()
const { scope, matchesQuery } = useRoadmapFilters()

type Sort = 'votes' | 'new' | 'mine'
const sort = ref<Sort>('votes')
const SORTS: { value: Sort; label: string }[] = [
  { value: 'votes', label: 'Most votes' },
  { value: 'new', label: 'Newest' },
  { value: 'mine', label: 'Yours' }
]
const STATUS: Record<RequestStatus, { label: string; tone: PillTone }> = {
  open: { label: 'Under review', tone: 'blue' },
  accepted: { label: 'On the roadmap', tone: 'green' },
  declined: { label: 'Declined', tone: 'red' },
  merged: { label: 'Merged', tone: 'gray' }
}

const shown = computed(() =>
  props.requests
    .filter((r) => (scope.value === 'all' || r.scope === scope.value) && (sort.value !== 'mine' || r.mine) && matchesQuery(`${r.title} ${r.body}`))
    .sort((a, b) =>
      // Declined requests sink to the bottom either way.
      Number(a.status === 'declined') - Number(b.status === 'declined') ||
      (sort.value === 'votes' ? b.votes - a.votes : 0) ||
      b.createdAt.localeCompare(a.createdAt)
    )
)

const pending = ref(new Set<number>())
async function vote(r: FeatureRequest) {
  pending.value.add(r.id)
  if (await voteForRequest(r.id, !r.voted)) emit('changed')
  pending.value.delete(r.id)
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
  <section aria-labelledby="requests-title" class="min-w-0 rounded-2xl border bg-card px-6 pt-5 pb-1.5 text-card-foreground">
    <div class="flex flex-wrap items-center gap-3 pb-3.5">
      <h2 id="requests-title" class="text-[17px] font-semibold">Ideas</h2>
      <span class="inline-flex h-5 items-center rounded-full border bg-muted px-2 text-xs font-semibold tabular-nums">{{ shown.length }}</span>
      <div role="group" aria-label="Sort" class="ml-auto inline-flex gap-0.5 rounded-[10px] border bg-background p-1">
        <button
          v-for="s in SORTS" :key="s.value" type="button" class="h-8 rounded-lg px-3 text-[13px] font-medium"
          :class="sort === s.value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'" :aria-pressed="sort === s.value" @click="sort = s.value"
        >{{ s.label }}</button>
      </div>
    </div>

    <p v-if="!requests.length" class="border-t py-6 text-center text-sm text-muted-foreground">No requests yet. Be the first to suggest something.</p>
    <p v-else-if="!shown.length" class="border-t py-6 text-center text-sm text-muted-foreground">{{ sort === 'mine' ? 'You haven’t suggested anything yet.' : 'No request matches.' }}</p>

    <article v-for="r in shown" :key="r.id" class="flex items-start gap-4 border-t py-4" :class="{ 'opacity-70': r.status === 'declined' || r.hidden }">
      <RoadmapVoteButton size="box" :votes="r.votes" :voted="r.voted" :title="r.title" :disabled="!canVote(r) || pending.has(r.id)" @toggle="vote(r)" />
      <div class="grid min-w-0 flex-1 gap-1">
        <div class="flex items-start gap-2.5">
          <h3 class="text-[15px] font-semibold">{{ r.title }}</h3>
          <span class="ml-auto flex shrink-0 items-center gap-1.5">
            <span v-if="r.hidden" class="flex items-center gap-1 text-xs text-muted-foreground"><EyeOff class="size-3.5" />Hidden</span>
            <PagePill :tone="STATUS[r.status].tone">{{ STATUS[r.status].label }}</PagePill>
            <DropdownMenu v-if="staff">
              <DropdownMenuTrigger as-child>
                <Button variant="ghost" size="icon" class="-my-1 size-7" :aria-label="`Actions for ${r.title}`"><MoreHorizontal /></Button>
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
          </span>
        </div>
        <p v-if="r.body" class="text-[13px] whitespace-pre-line text-muted-foreground">{{ r.body }}</p>
        <p v-if="r.reply" class="mt-1 rounded-lg bg-muted px-3 py-2 text-[13px]"><span class="font-semibold">Staff:</span> {{ r.reply }}</p>
        <div class="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
          <RoadmapScopeTag :scope="r.scope" />
          <RoadmapPerson :name="r.mine ? 'You' : r.author" />
          <span>{{ shortDate(r.createdAt) }}</span>
        </div>
      </div>
    </article>

    <RoadmapRequestActionDialog v-model:open="dialog.open" :request="dialog.request" :action="dialog.action" :requests="requests" @done="emit('changed')" />
  </section>
</template>
