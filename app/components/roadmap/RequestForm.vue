<script setup lang="ts">
import { toast } from 'vue-sonner'

// Suggesting a feature. Shows existing requests with similar titles, so people vote instead of repeating them.
const props = defineProps<{ requests: FeatureRequest[] }>()
const emit = defineEmits<{ done: []; posted: [request: FeatureRequest] }>()

const form = ref({ title: '', body: '', scope: 'dashboard' as RoadmapScope })
const busy = ref(false)

// Requests sharing at least two words of four letters or more with the title.
const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])
const similar = computed(() => {
  const mine = words(form.value.title)
  if (mine.size < 2 && form.value.title.trim().length < 6) return []
  return props.requests
    .filter((r) => r.status === 'open' || r.status === 'accepted')
    .map((r) => ({ r, shared: [...words(r.title)].filter((w) => mine.has(w)).length }))
    .filter((x) => x.shared >= Math.min(2, mine.size))
    .sort((a, b) => b.shared - a.shared || b.r.votes - a.r.votes)
    .slice(0, 3)
    .map((x) => x.r)
})

async function post() {
  busy.value = true
  try {
    const request = await $fetch<FeatureRequest>('/api/requests', { method: 'POST', body: form.value })
    toast.success('Request posted', { description: "You've voted for it. Others can vote too." })
    emit('posted', request)
  } catch (err) {
    toast.error('Not posted', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Card class="gap-4">
    <CardHeader>
      <CardTitle class="text-base">Suggest a feature</CardTitle>
      <CardDescription>Describe what you'd like and why. Others can vote for it, and staff reply here.</CardDescription>
    </CardHeader>
    <CardContent class="grid gap-3">
      <div class="grid gap-1.5">
        <Label for="request-title">What would you like?</Label>
        <Input id="request-title" v-model="form.title" :maxlength="ROADMAP_LIMITS.title" placeholder="e.g. Show which crew is on each train" />
      </div>
      <p v-if="similar.length" class="text-sm text-muted-foreground">
        Similar requests:
        <template v-for="(r, i) in similar" :key="r.id">{{ i ? ', ' : '' }}<span class="font-medium text-foreground">{{ r.title }}</span> ({{ r.votes }} {{ r.votes === 1 ? 'vote' : 'votes' }})</template>.
        Vote there instead if it's the same idea.
      </p>
      <div class="grid gap-1.5">
        <Label for="request-body">Why would it help? <span class="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea id="request-body" v-model="form.body" rows="3" :maxlength="ROADMAP_LIMITS.body" placeholder="What you'd use it for" />
      </div>
      <div class="grid gap-1.5 sm:max-w-xs">
        <Label>For</Label>
        <Select v-model="form.scope">
          <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem v-for="s in ROADMAP_SCOPES" :key="s.value" :value="s.value">{{ s.label }}</SelectItem></SelectContent>
        </Select>
      </div>
      <div class="flex gap-2">
        <Button :disabled="busy || !form.title.trim()" @click="post">Post request</Button>
        <Button variant="ghost" @click="emit('done')">Cancel</Button>
      </div>
    </CardContent>
  </Card>
</template>
