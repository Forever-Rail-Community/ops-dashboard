<script setup lang="ts">
// The Desks page's body (board F): the line as its desks, a card for each with who's on it and Clock in, Watch or
// Clock out, today's desk changes, and the rules. Taking reads the last turnover note first (board J); leaving writes one
// (board I). A desk someone's on can be asked for, or taken over by staff (FOR-17), and a dispatcher can cover desks
// next to theirs, up to the line's limit (deskCoverProblem). The page does the saving; this only asks.
import { useIntervalFn } from '@vueuse/core'

const props = defineProps<{
  line: CtcLine
  board: Board
  desks: BoardDesk[]
  trains: BoardTrain[]
  aspects: Record<string, SignalAspect>
  thrown: Record<string, boolean>
  changes: CtcDeskChange[]
  settings: CtcDeskSettings
  requests: CtcDeskRequest[] // open requests for this line's desks
  userId: string
  canTake: boolean // has "Clear signals and throw switches"
  canTakeover: boolean // has "Take over a CTC desk without asking its dispatcher"
  canEdit: boolean
  busy?: boolean
}>()
const emit = defineEmits<{
  take: [id: string]
  leave: [id: string, note: { items: string[]; text: string }]
  watch: [id: string]
  edit: []
  ask: [id: string, takeover: boolean]
  cancelAsk: [id: string]
}>()

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const mine = computed(() => props.desks.filter((d) => d.mine))
const spans = computed(() => props.desks.map((d) => d.span))
// Why you can't clock in to (or ask for) a desk, if you can't.
const problem = (d: BoardDesk) => deskCoverProblem(spans.value, d.id, props.userId, props.settings.maxDesks)
const request = (d: BoardDesk) => props.requests.find((r) => r.deskId === d.id)
const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 1000)
const left = (r: CtcDeskRequest) => {
  const sec = Math.min(DESK_REQUEST_SEC, Math.max(0, Math.ceil((Date.parse(r.until) - now.value) / 1000)))
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
const facts = (d: BoardDesk) => {
  const mp = deskMileposts(props.board, d)
  return {
    span: d.stretch,
    mp: `MP ${mp.from.toFixed(1)} to ${mp.to.toFixed(1)}, ${mp.miles.toFixed(1)} miles`,
    trains: props.trains.filter((t) => t.x >= d.x1 && t.x < d.x2).length,
    sidings: spanSidings(props.line, d.span)
  }
}

const taking = ref<BoardDesk>()
const leaving = ref<BoardDesk>()
const takeOpen = computed({ get: () => !!taking.value, set: (v) => { if (!v) taking.value = undefined } })
const leaveOpen = computed({ get: () => !!leaving.value, set: (v) => { if (!v) leaving.value = undefined } })
</script>

<template>
  <div class="grid gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Desks</h1>
        <p class="text-muted-foreground">The {{ line.name }} is divided into desks. Clock in to a desk to dispatch its territory from the CTC board.</p>
      </div>
      <Button v-if="canEdit" variant="outline" @click="emit('edit')">Edit desks</Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ line.name }}</CardTitle>
        <CardDescription>
          {{ line.towns[0]?.name }} to {{ line.towns.at(-1)?.name }}, {{ Math.round(board.miles) }} miles, divided into {{ desks.length }} desks.
          Dots show current train positions.
        </CardDescription>
      </CardHeader>
      <CardContent><CtcDeskStrip :board="board" :desks="desks" :trains="trains" /></CardContent>
    </Card>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card v-for="d in desks" :key="d.id" :class="d.mine ? 'border-sky-500' : ''">
        <CardHeader>
          <div class="flex items-center justify-between gap-2">
            <CardTitle>{{ d.name }}</CardTitle>
            <Badge variant="outline" :class="d.mine ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300' : d.holder ? '' : 'text-muted-foreground'">
              {{ d.mine ? 'You' : d.holder ? `${d.holder} on duty` : 'Open' }}
            </Badge>
          </div>
          <CardDescription>{{ facts(d).span }}<br>{{ facts(d).mp }}</CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4">
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <div><dt class="text-muted-foreground">Trains now</dt><dd class="text-lg font-semibold tabular-nums">{{ facts(d).trains }}</dd></div>
            <div><dt class="text-muted-foreground">Sidings</dt><dd class="text-lg font-semibold tabular-nums">{{ facts(d).sidings }}</dd></div>
          </dl>
          <p class="text-sm text-muted-foreground">
            <template v-if="d.mine">You have been on duty since {{ time(d.span.desk.holder!.since) }}.</template>
            <template v-else-if="d.holder">{{ d.holder }} has been on duty since {{ time(d.span.desk.holder!.since) }}.</template>
            <template v-else>No dispatcher is on duty. Until one clocks in, this territory is worked from the in-game CTC panel.</template>
          </p>
          <div class="flex flex-wrap gap-2">
            <template v-if="d.mine">
              <Button @click="emit('watch', d.id)">Open the board</Button>
              <Button variant="outline" :disabled="busy" @click="leaving = d">Clock out</Button>
            </template>
            <template v-else-if="request(d)?.from.userId === userId">
              <Button variant="outline" :disabled="busy" @click="emit('cancelAsk', d.id)">{{ request(d)!.takeover ? 'Cancel takeover' : 'Withdraw request' }}</Button>
            </template>
            <template v-else>
              <Button v-if="!d.holder && canTake" :disabled="busy || !!problem(d)" @click="taking = d">{{ mine.length ? 'Cover this desk' : 'Clock in' }}</Button>
              <Button v-else-if="d.holder && canTakeover" :disabled="busy || !!problem(d) || !!request(d)" @click="emit('ask', d.id, true)">Take over</Button>
              <Button v-else-if="d.holder && canTake" :disabled="busy || !!problem(d) || !!request(d)" @click="emit('ask', d.id, false)">Request transfer</Button>
              <Button variant="outline" @click="emit('watch', d.id)">Watch</Button>
            </template>
          </div>
          <p v-if="request(d)?.from.userId === userId" role="status" class="text-sm font-medium">
            <template v-if="request(d)!.takeover">Takeover in progress. {{ d.holder }} will be clocked out and you will be clocked in at {{ left(request(d)!) }}.</template>
            <template v-else>Transfer requested from {{ d.holder }}. Awaiting response ({{ left(request(d)!) }}).</template>
          </p>
          <p v-else-if="request(d) && d.mine" class="text-sm font-medium">
            <template v-if="request(d)!.takeover">Staff takeover in progress by {{ request(d)!.from.name }}. You will be clocked out in {{ left(request(d)!) }}.</template>
            <template v-else>Transfer requested by {{ request(d)!.from.name }}.</template>
          </p>
          <p v-else-if="request(d)" class="text-xs text-muted-foreground">{{ request(d)!.takeover ? 'Staff takeover in progress by' : 'Transfer requested by' }} {{ request(d)!.from.name }}.</p>
          <p v-else-if="canTake && !d.mine && problem(d)" class="text-xs text-muted-foreground">{{ problem(d) }}</p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Desk changes</CardTitle>
          <CardDescription>Clock-ins, clock-outs and transfers in the last 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <CtcDeskTimeline v-if="changes.length" :changes="changes" class="max-h-[28rem] overflow-y-auto pr-1" />
          <p v-else class="text-sm text-muted-foreground">No desk changes in the last 24 hours.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Desk rules</CardTitle>
          <CardDescription>These apply to every desk on the {{ line.name }}.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="grid list-disc gap-1.5 pl-5 text-sm">
            <li>Each desk has one dispatcher on duty. Anyone may watch a desk.</li>
            <li v-if="settings.maxDesks > 1">A dispatcher may cover up to {{ settings.maxDesks }} adjacent desks from one board.</li>
            <li>To take a desk that is staffed, request a transfer. The dispatcher on duty has {{ DESK_REQUEST_SEC }} seconds to approve or decline. No response declines the request.</li>
            <li>Staff may take over any desk without a request. The dispatcher on duty is notified, then clocked out {{ DESK_REQUEST_SEC }} seconds later.</li>
            <li>The CTC board controls only the desks you are on duty for. Open desks are worked from the in-game CTC panel.</li>
            <li>When clocking out, you write a turnover note. The next dispatcher must read it before clocking in.</li>
            <li>If your Operations Center is closed for 2 minutes, you are clocked out and staff are notified on Discord.</li>
            <li v-if="settings.idleMinutes">After {{ settings.idleMinutes }} minutes with no activity on the Operations Center, you are clocked out.</li>
            <li>The board shows trains approaching from adjacent desks.</li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="takeOpen">
      <CtcDeskTake v-if="taking" :desk="taking" :line="line" :busy="busy" @take="emit('take', taking.id); taking = undefined" @cancel="taking = undefined" />
    </Dialog>
    <Dialog v-model:open="leaveOpen">
      <CtcDeskLeave
        v-if="leaving" :desk="leaving" :items="turnoverItems(board, leaving, aspects, thrown, trains)" :busy="busy"
        @leave="(note) => { emit('leave', leaving!.id, note); leaving = undefined }" @cancel="leaving = undefined"
      />
    </Dialog>
  </div>
</template>
