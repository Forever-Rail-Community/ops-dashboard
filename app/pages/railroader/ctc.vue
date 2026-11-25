<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

definePageMeta({ title: 'CTC board' })

const { user } = useUserSession()
const canSetUp = computed(() => user.value?.permissions?.includes('admin.lines') ?? false)

const { data: lines, error } = useFetch<CtcLine[]>('/api/railroader/ctc/lines', { server: false, lazy: true })
const forbidden = computed(() => error.value?.statusCode === 403)
// The same live data the map shows (refreshed every 5 seconds while the page is open), so a board costs nothing extra.
const { live, response, error: liveError } = useLiveMap(ref(null))

const chosen = ref<string>()
const line = computed(() => lines.value?.find((l) => l.id === chosen.value) ?? lines.value?.[0])
const layout = computed(() => live.value.signals.layout)
const board = computed(() => (line.value && layout.value?.controlPoints.length ? boardLayout(line.value, layout.value) : null))

const status = computed(() => {
  const r = response.value
  if (liveError.value) return { warn: true, text: "Can't load the signals right now." }
  if (!r) return { warn: false, text: 'Loading the signals…' }
  if (r.signalsAge.ageSec === null) return { warn: true, text: 'No signals reported yet. They appear while the Railroader game server is running with the host mod.' }
  if (r.signalsAge.stale) return { warn: true, text: `The game server stopped reporting ${formatAge(r.signalsAge.ageSec)}. Showing the last known signals and switches.` }
  return { warn: false, text: `Live, updated ${formatAge(r.signalsAge.ageSec)}.` }
})
</script>

<template>
  <PageBody>
    <PageHeader title="CTC board" description="The line as the game's signals, switches and occupied track show it, live. Watching only: work the railroad from the game's own panel." />

    <Alert v-if="forbidden">
      <CircleAlert />
      <AlertTitle>Your role can't view the CTC board</AlertTitle>
      <AlertDescription>Ask an admin to give your role the "View the Railroader CTC board" permission.</AlertDescription>
    </Alert>

    <Alert v-else-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>Can't load the board</AlertTitle>
      <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
    </Alert>

    <Alert v-else-if="lines && !lines.length">
      <CircleAlert />
      <AlertTitle>No lines set up yet</AlertTitle>
      <AlertDescription>
        <template v-if="canSetUp">Set one up in <NuxtLink to="/admin" class="underline">Admin, CTC lines</NuxtLink>. It's filled in from the game.</template>
        <template v-else>An admin sets up the board's lines. Ask one to add this railroad's.</template>
      </AlertDescription>
    </Alert>

    <template v-else-if="lines">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="flex items-center gap-2 text-sm" :class="status.warn ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'" role="status">
          <span class="size-2 shrink-0 rounded-full" :class="status.warn ? 'bg-amber-500' : 'bg-emerald-500'" />
          {{ status.text }}
        </p>
        <Select v-if="lines.length > 1" :model-value="line?.id" @update:model-value="(v) => (chosen = String(v))">
          <SelectTrigger class="w-64" aria-label="Line"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="l in lines" :key="l.id" :value="l.id">{{ l.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CtcBoard v-if="board" :board="board" :aspects="live.signals.aspects" :occupied="live.signals.occupied" :thrown="live.switches" />
      <p v-else-if="response && !layout" class="text-sm text-muted-foreground">Waiting for the game server's signal layout. It's sent when the game loads a save, and every 10 minutes.</p>
      <p v-else-if="layout && !layout.controlPoints.length" class="text-sm text-muted-foreground">
        The game server's layout has no control points. Update the agent to 0.15 and the host mod to 0.7.0 or later.
      </p>
      <Skeleton v-else class="h-80 rounded-xl" />
      <p v-if="line" class="text-xs text-muted-foreground">{{ line.name }}: {{ line.towns.length }} towns. Set up by {{ line.updatedBy }}.</p>
    </template>

    <Skeleton v-else class="h-80 rounded-xl" />
  </PageBody>
</template>
