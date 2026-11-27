<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

// Edit desks (board H), for staff who set up the CTC board's lines (the route guard sends anyone else away).
definePageMeta({ title: 'Edit desks' })

const { lines, error } = useCtcLines()
const { data: desks, busy, save } = useDesks()
const { live } = useLiveMap(ref(null))

const route = useRoute()
const line = computed(() => lines.value?.find((l) => l.id === route.query.line) ?? lines.value?.[0])
const board = computed(() => (line.value && live.value.signals.layout ? boardLayout(line.value, live.value.signals.layout) : null))
const back = () => navigateTo(`/railroader/desks?line=${line.value?.id ?? ''}`)
async function saved(list: { id?: string; name: string; start: string }[], settings: CtcDeskSettings) {
  if (await save(line.value!.id, list, settings)) back()
}
</script>

<template>
  <PageBody>
    <Alert v-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>Can't load the lines</AlertTitle>
      <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
    </Alert>
    <CtcDeskEdit
      v-else-if="line && board && desks" :line="line" :board="board" :desks="desks.desks.filter((d) => d.lineId === line!.id)" :settings="deskSettings(desks, line.id)"
      :busy="busy"
      @save="saved" @back="back"
    />
    <Skeleton v-else class="h-80 rounded-xl" />
  </PageBody>
</template>
