<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Lightbulb, Send } from '@lucide/vue'

// Suggesting a feature, beside the list. As you type it points out a request that looks the same, with its vote
// button, so votes stay together instead of being split across repeats.
const props = defineProps<{ requests: FeatureRequest[] }>()
const emit = defineEmits<{ posted: [request: FeatureRequest]; vote: [] }>()

const blank = () => ({ title: '', body: '', scope: 'dashboard' as RoadmapScope })
const form = ref(blank())
const busy = ref(false)

// The open request sharing the most words of four letters or more with the title (at least two).
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])
const similar = computed(() => {
  const mine = words(form.value.title)
  if (mine.size < 2 && form.value.title.trim().length < 6) return null
  return props.requests
    .filter((r) => r.status === 'open' || r.status === 'accepted')
    .map((r) => ({ r, shared: [...words(r.title)].filter((w) => mine.has(w)).length }))
    .filter((x) => x.shared >= Math.min(2, mine.size))
    .sort((a, b) => b.shared - a.shared || b.r.votes - a.r.votes)[0]?.r ?? null
})

async function voteSimilar(r: FeatureRequest) {
  if (await toggleVote(r.id, !r.voted)) emit('vote')
}

async function post() {
  busy.value = true
  try {
    const request = await $fetch<FeatureRequest>('/api/requests', { method: 'POST', body: form.value })
    toast.success('Suggestion sent', { description: "You've voted for it. Others can vote too." })
    form.value = blank()
    emit('posted', request)
  } catch (err) {
    toast.error('Not sent', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageSection :icon="Lightbulb" title="Suggest a feature" description="Members vote on it, and staff move popular ideas onto the roadmap.">
    <form class="grid gap-3.5 border-t pt-3.5 pb-4" @submit.prevent="post">
      <div class="grid gap-1.5">
        <Label for="request-title">Your idea</Label>
        <Input id="request-title" v-model="form.title" :maxlength="ROADMAP_LIMITS.title" placeholder="Show which crew is on each train" />
      </div>
      <div v-if="similar" role="status" class="grid gap-2 rounded-[10px] border border-sky-500/25 bg-sky-500/8 p-3 text-[13px]">
        <span class="text-sky-700 dark:text-sky-200">This looks like one that’s already been suggested:</span>
        <span class="flex items-center gap-2.5">
          <span class="min-w-0 flex-1 truncate font-semibold">{{ similar.title }}</span>
          <RoadmapVoteButton :votes="similar.votes" :voted="similar.voted" :title="similar.title" @toggle="voteSimilar(similar)" />
        </span>
        <span class="text-muted-foreground">Vote for it instead, so the votes stay together.</span>
      </div>
      <div class="grid gap-1.5">
        <Label for="request-body">Details <span class="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="request-body" v-model="form.body" rows="3" :maxlength="ROADMAP_LIMITS.body" placeholder="What would it help you do?" />
      </div>
      <div class="grid gap-1.5">
        <Label for="request-scope">Area</Label>
        <Select v-model="form.scope">
          <SelectTrigger id="request-scope" class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem v-for="s in ROADMAP_SCOPES" :key="s.value" :value="s.value">{{ s.label }}</SelectItem></SelectContent>
        </Select>
      </div>
      <Button type="submit" :disabled="busy || !form.title.trim()"><Send />Send suggestion</Button>
    </form>
  </PageSection>
</template>
