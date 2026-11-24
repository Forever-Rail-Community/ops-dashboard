<script setup lang="ts">
import { Bug, FileText, Lightbulb } from '@lucide/vue'

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

const reporting = ref(false)
async function sent() {
  reporting.value = false
  await refreshAll()
}
const viewingId = ref<number | null>(null)
const viewing = computed(() => mine.data.value.find((r) => r.id === viewingId.value) ?? null)
const answered = computed(() => mine.data.value.filter((r) => r.reply).length)
</script>

<template>
  <PageBody>
    <PageHeader title="Bug reports" description="Tell us what’s broken. Only you and staff can see your reports, and staff reply here.">
      <template #actions><Button @click="reporting = true"><Bug />Report a bug</Button></template>
    </PageHeader>

    <Tabs v-model="tab">
      <TabsList v-if="staff">
        <TabsTrigger value="mine">Your reports</TabsTrigger>
        <TabsTrigger value="all">All reports {{ all.data.value.length }}</TabsTrigger>
      </TabsList>

      <TabsContent value="mine" class="pt-2">
        <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <PageSection :icon="FileText" title="Your reports" description="What you’ve reported, and where each one stands. Open one to see staff’s reply." :count="mine.data.value.length" :row-height="64">
            <template #action><span v-if="answered" class="text-muted-foreground">{{ answered }} with a staff reply</span></template>
            <PageRow v-for="r in mine.data.value" :key="r.id" as="button" type="button" :title="r.title" :detail="`${r.area}, ${shortDate(r.createdAt)}`" @click="viewingId = r.id">
              <template #trailing>
                <span class="flex items-center gap-2.5">
                  <span v-if="r.reply" class="hidden text-[13px] text-muted-foreground sm:inline">Staff replied</span>
                  <BugsStatusTag :status="r.status" />
                </span>
              </template>
            </PageRow>
            <template #empty>You haven’t reported anything yet.</template>
          </PageSection>
          <PageSection :icon="Lightbulb" title="Good reports get fixed faster" description="What helps staff find the problem.">
            <PageRow title="Say where it happened" detail="Which page, and which part of it" />
            <PageRow title="Say what you expected" detail="And what you saw instead" />
            <PageRow v-if="meta.screenshots" title="Add a screenshot" detail="Paste it straight into the report" />
          </PageSection>
        </div>
      </TabsContent>

      <TabsContent v-if="staff" value="all" class="pt-2">
        <BugsStaffReports :reports="all.data.value" :open-id="openId" @changed="refreshAll" />
      </TabsContent>
    </Tabs>

    <Dialog v-model:open="reporting">
      <DialogContent class="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Report a bug</DialogTitle>
          <DialogDescription>Only you and staff can see it.</DialogDescription>
        </DialogHeader>
        <BugsReportForm :screenshots="meta.screenshots" @sent="sent" @cancel="reporting = false" />
      </DialogContent>
    </Dialog>
    <BugsReportPanel :report="viewing" @close="viewingId = null" />
  </PageBody>
</template>
