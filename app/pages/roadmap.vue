<script setup lang="ts">
import { Plus } from '@lucide/vue'

// What's planned, being built and shipped, and feature requests with votes.
definePageMeta({ title: 'Roadmap' })

const route = useRoute()
const router = useRouter()
const { staff, items, requests } = useRoadmap()
await Promise.all([items, requests])

const tab = computed({
  get: () => (route.query.tab === 'requests' ? 'requests' : 'roadmap'),
  set: (value) => router.replace({ query: { ...route.query, tab: value === 'requests' ? 'requests' : undefined } })
})
const scope = ref<RoadmapScope | 'all'>('all')
const suggesting = ref(false)
const refreshAll = () => Promise.all([items.refresh(), requests.refresh()])

function suggest() {
  tab.value = 'requests'
  suggesting.value = true
}
async function posted() {
  suggesting.value = false
  await requests.refresh()
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Roadmap</h2>
        <p class="text-sm text-muted-foreground">What's planned, being built and shipped. Suggest a feature, or vote for the ones you want.</p>
      </div>
      <Button @click="suggest"><Plus />Suggest a feature</Button>
    </div>

    <Tabs v-model="tab">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="requests">Feature requests ({{ requests.data.value.length }})</TabsTrigger>
        </TabsList>
        <div class="flex rounded-md border p-0.5 text-sm" role="group" aria-label="Show">
          <button
            v-for="s in [{ value: 'all', label: 'All' }, ...ROADMAP_SCOPES]"
            :key="s.value"
            class="rounded px-2.5 py-1"
            :class="scope === s.value ? 'bg-accent font-medium' : 'text-muted-foreground'"
            :aria-pressed="scope === s.value"
            @click="scope = s.value as RoadmapScope | 'all'"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <TabsContent value="roadmap" class="pt-4">
        <RoadmapBoard :items="items.data.value" :staff="staff" :scope="scope" @changed="refreshAll" />
      </TabsContent>
      <TabsContent value="requests" class="grid gap-4 pt-4">
        <RoadmapRequestForm v-if="suggesting" :requests="requests.data.value" @done="suggesting = false" @posted="posted" />
        <RoadmapRequestList :requests="requests.data.value" :staff="staff" :scope="scope" @changed="refreshAll" />
      </TabsContent>
    </Tabs>
  </div>
</template>
