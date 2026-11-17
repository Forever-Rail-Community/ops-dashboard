<script setup lang="ts">
import { Lock } from '@lucide/vue'

// Reporting bugs and following your reports; staff also see and answer everyone's.
definePageMeta({ title: 'Bug reports' })

const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const staff = computed(() => user.value?.permissions?.includes('bugs.manage') ?? false)

const { data: meta } = useFetch<{ screenshots: boolean }>('/api/bugs/meta', { default: () => ({ screenshots: false }) })
const mine = useFetch<BugReport[]>('/api/bugs', { key: 'my-bugs', default: () => [] })
const all = useFetch<BugReport[]>('/api/bugs', { key: 'all-bugs', query: { all: '1' }, default: () => [], immediate: staff.value })

const tab = computed({
  get: () => (staff.value && route.query.tab === 'all' ? 'all' : 'mine'),
  set: (value) => router.replace({ query: { tab: value === 'all' ? 'all' : undefined } })
})
const openId = Number(route.query.report) || undefined
const refreshAll = () => Promise.all([mine.refresh(), staff.value ? all.refresh() : null])
const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight">Bug reports</h2>
      <p class="flex items-center gap-1.5 text-sm text-muted-foreground"><Lock class="size-3.5" />Only you and staff can see your reports.</p>
    </div>

    <Tabs v-model="tab">
      <TabsList v-if="staff">
        <TabsTrigger value="mine">Report and track</TabsTrigger>
        <TabsTrigger value="all">All reports ({{ all.data.value.length }})</TabsTrigger>
      </TabsList>

      <TabsContent value="mine" class="grid gap-6 pt-4 lg:grid-cols-2">
        <BugsReportForm :screenshots="meta.screenshots" @sent="refreshAll" />
        <section class="grid content-start gap-2" aria-label="Your reports">
          <h3 class="text-sm font-medium text-muted-foreground">Your reports</h3>
          <p v-if="!mine.data.value.length" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">You haven't reported anything yet.</p>
          <article v-for="r in mine.data.value" :key="r.id" class="grid gap-2 rounded-xl border bg-card p-4">
            <div class="flex items-start justify-between gap-3">
              <p class="font-medium">{{ r.title }}</p>
              <BugsStatusTag :status="r.status" />
            </div>
            <p class="text-xs text-muted-foreground">#{{ r.id }} · {{ r.area }} · {{ date(r.createdAt) }}</p>
            <BugsScreenshots :ids="r.screenshots" />
            <p v-if="r.reply" class="rounded-lg bg-muted p-2.5 text-sm"><span class="font-medium">Staff:</span> {{ r.reply }}</p>
            <p v-if="r.roadmapItem" class="text-xs text-muted-foreground">On the roadmap as “{{ r.roadmapItem.title }}”</p>
          </article>
        </section>
      </TabsContent>

      <TabsContent v-if="staff" value="all" class="pt-4">
        <BugsStaffReports :reports="all.data.value" :open-id="openId" @changed="refreshAll" />
      </TabsContent>
    </Tabs>
  </div>
</template>
