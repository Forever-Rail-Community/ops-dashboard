<script setup lang="ts">
// The Desks page's body (board F): the line as its desks, a card for each with who's on it and Take, Watch or
// Leave, today's desk changes, and the rules. Taking reads the last turnover note first (board J); leaving writes one
// (board I). The page does the saving; this only asks.
const props = defineProps<{
  line: CtcLine
  board: Board
  desks: BoardDesk[]
  trains: BoardTrain[]
  aspects: Record<string, SignalAspect>
  thrown: Record<string, boolean>
  changes: CtcDeskChange[]
  settings: CtcDeskSettings
  canTake: boolean // has "Clear signals and throw switches"
  canEdit: boolean
  busy?: boolean
}>()
const emit = defineEmits<{
  take: [id: string]
  leave: [id: string, note: { items: string[]; text: string }]
  watch: [id: string]
  edit: []
}>()

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const mine = computed(() => props.desks.find((d) => d.mine))
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
        <p class="text-muted-foreground">The {{ line.name }} is split into desks. Take one to dispatch that stretch from the CTC board.</p>
      </div>
      <Button v-if="canEdit" variant="outline" @click="emit('edit')">Edit desks</Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>{{ line.name }}</CardTitle>
        <CardDescription>
          {{ line.towns[0]?.name }} to {{ line.towns.at(-1)?.name }}, {{ Math.round(board.miles) }} miles, split into {{ desks.length }} desks.
          Dots are trains, where they are now.
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
            <template v-if="d.mine">You've been on duty on this desk since {{ time(d.span.desk.holder!.since) }}.</template>
            <template v-else-if="d.holder">{{ d.holder }} has been on duty on this desk since {{ time(d.span.desk.holder!.since) }}. You can watch it.</template>
            <template v-else>No one is on duty on this desk. For now, anyone in the game can work it from the CTC panel.</template>
          </p>
          <div class="flex flex-wrap gap-2">
            <template v-if="d.mine">
              <Button @click="emit('watch', d.id)">Open the board</Button>
              <Button variant="outline" :disabled="busy" @click="leaving = d">Leave</Button>
            </template>
            <template v-else>
              <Button v-if="!d.holder && canTake" :disabled="busy || !!mine" @click="taking = d">Take this desk</Button>
              <Button variant="outline" @click="emit('watch', d.id)">Watch</Button>
            </template>
          </div>
          <p v-if="!d.holder && canTake && mine" class="text-xs text-muted-foreground">Leave {{ mine.name }} first to take this one.</p>
        </CardContent>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Desk changes</CardTitle>
          <CardDescription>Who took or left a desk today.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul v-if="changes.length" class="grid gap-2.5 text-sm">
            <li v-for="(c, k) in changes" :key="k" class="flex gap-3">
              <span class="w-16 shrink-0 text-muted-foreground tabular-nums">{{ time(c.at) }}</span>{{ c.text }}
            </li>
          </ul>
          <p v-else class="text-sm text-muted-foreground">Nobody has taken or left a desk today.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>How desks work</CardTitle>
          <CardDescription>The same rules for every desk.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="grid list-disc gap-1.5 pl-5 text-sm">
            <li>One dispatcher per desk. Anyone can watch.</li>
            <li>The CTC board works only the desk you're on. Open desks are worked from the game's own CTC panel.</li>
            <li>Leaving, you write a turnover note. The next dispatcher reads it before taking the desk.</li>
            <li>With the Operations Center closed for 2 minutes, you're taken off your desk, and Discord is told.</li>
            <li v-if="settings.idleMinutes">With no activity on the Operations Center for {{ settings.idleMinutes }} minutes, you're taken off too.</li>
            <li>The board shows what's heading your way from the desks either side.</li>
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
