<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

// Edit desks (board H), for staff who set up the CTC board's lines.
definePageMeta({ title: 'Edit desks' })

const { user } = useUserSession()
const allowed = computed(() => user.value?.permissions?.includes('admin.lines') ?? false)
const { data: lines, error } = useFetch<CtcLine[]>('/api/railroader/ctc/lines', { server: false, lazy: true })
const { data: desks, busy, save } = useDesks()
const { live } = useLiveMap(ref(null))

const route = useRoute()
const line = computed(() => lines.value?.find((l) => l.id === route.query.line) ?? lines.value?.[0])
const board = computed(() => (line.value && live.value.signals.layout ? boardLayout(line.value, live.value.signals.layout) : null))
const back = () => navigateTo(`/railroader/desks?line=${line.value?.id ?? ''}`)
async function saved(list: { id?: string; name: string; start: string }[]) {
  if (await save(line.value!.id, list)) back()
}
</script>

<template>
  <PageBody>
    <Alert v-if="!allowed">
      <CircleAlert />
      <AlertTitle>Your role can't edit desks</AlertTitle>
      <AlertDescription>Editing desks needs the "Set up the CTC board's lines" permission.</AlertDescription>
    </Alert>
    <Alert v-else-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>Can't load the lines</AlertTitle>
      <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
    </Alert>
    <CtcDeskEdit
      v-else-if="line && board && desks" :line="line" :board="board" :desks="desks.desks.filter((d) => d.lineId === line!.id)" :busy="busy"
      @save="saved" @cancel="back"
    />
    <Skeleton v-else class="h-80 rounded-xl" />
  </PageBody>
</template>
