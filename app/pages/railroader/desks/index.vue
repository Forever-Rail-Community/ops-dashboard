<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

// The Desks page (board F): a line's desks and who's on them, with Clock in, Watch and Clock out (CtcDesks).
definePageMeta({ title: 'Desks' })

const { user } = useUserSession()
const can = (p: string) => user.value?.permissions?.includes(p) ?? false

const { lines, error } = useCtcLines()
const forbidden = computed(() => error.value?.statusCode === 403)
const { data: desks, busy, take, leave } = useDesks()
const { data: requests, busy: asking, ask, withdraw, watchAll } = useDeskRequests()
watchAll() // keeps requests fresh while this page is open, for every desk's card
const { live } = useLiveMap(ref(null))
const layout = computed(() => live.value.signals.layout)

const route = useRoute()
const line = computed(() => lines.value?.find((l) => l.id === route.query.line) ?? lines.value?.[0])
const board = computed(() => (line.value && layout.value ? boardLayout(line.value, layout.value) : null))
const lineDesks = computed(() =>
  line.value && board.value ? boardDesks(line.value, board.value, deskSpans(line.value, desks.value?.desks.filter((d) => d.lineId === line.value!.id) ?? []), user.value?.id ?? '') : [])
const trains = computed(() => (board.value && layout.value ? boardTrains(board.value, layout.value, live.value.signals.aspects, live.value.trains) : []))
const changes = computed(() => desks.value?.changes.filter((c) => c.lineId === line.value?.id) ?? [])
</script>

<template>
  <PageBody>
    <Alert v-if="forbidden">
      <CircleAlert />
      <AlertTitle>Your role can't view the CTC board</AlertTitle>
      <AlertDescription>Ask an admin to give your role the "View the Railroader CTC board" permission.</AlertDescription>
    </Alert>

    <Alert v-else-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>Can't load the desks</AlertTitle>
      <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
    </Alert>

    <Alert v-else-if="lines && !lines.length">
      <CircleAlert />
      <AlertTitle>No lines set up yet</AlertTitle>
      <AlertDescription>Desks split a line of the CTC board. An admin sets up the lines in Admin, CTC lines.</AlertDescription>
    </Alert>

    <template v-else-if="line && board && desks">
      <div v-if="lines!.length > 1" class="mb-4 flex flex-wrap gap-2">
        <Button v-for="l in lines" :key="l.id" size="sm" :variant="l.id === line.id ? 'default' : 'outline'" @click="navigateTo({ query: { line: l.id } })">{{ l.name }}</Button>
      </div>
      <div v-if="!lineDesks.length" class="grid gap-4">
        <h1 class="text-2xl font-semibold tracking-tight">Desks</h1>
        <Alert>
          <CircleAlert />
          <AlertTitle>The {{ line.name }} has no desks yet</AlertTitle>
          <AlertDescription>
            Until desks are set up, anyone with CTC board control can dispatch the entire line.
            <template v-if="can('admin.lines')"> <NuxtLink :to="`/railroader/desks/edit?line=${line.id}`" class="underline">Set up its desks</NuxtLink>.</template>
          </AlertDescription>
        </Alert>
      </div>
      <CtcDesks
        v-else :line="line" :board="board" :desks="lineDesks" :trains="trains" :aspects="live.signals.aspects" :thrown="live.switches"
        :changes="changes" :settings="deskSettings(desks, line.id)" :requests="requests?.requests ?? []" :user-id="user?.id ?? ''"
        :can-take="can('ctc.control')" :can-takeover="can('ctc.takeover')" :can-edit="can('admin.lines')" :busy="busy || asking"
        @take="take" @leave="leave" @ask="ask" @cancel-ask="withdraw" @watch="(id) => navigateTo(`/railroader/ctc?desk=${id}`)" @edit="navigateTo(`/railroader/desks/edit?line=${line.id}`)"
      />
    </template>

    <Skeleton v-else class="h-80 rounded-xl" />
  </PageBody>
</template>
