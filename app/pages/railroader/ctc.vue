<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

definePageMeta({ title: 'CTC board' })

const { user } = useUserSession()
const canSetUp = computed(() => user.value?.permissions?.includes('admin.lines') ?? false)
const canControl = computed(() => user.value?.permissions?.includes('ctc.control') ?? false)

const { data: lines, error } = useFetch<CtcLine[]>('/api/railroader/ctc/lines', { server: false, lazy: true })
const forbidden = computed(() => error.value?.statusCode === 403)
// The same live data the map shows (refreshed every 5 seconds while the page is open), so a board costs nothing extra.
const { live, response, error: liveError } = useLiveMap(ref(null))

// Desks, and the one asked for by Watch on the Desks page (?desk=), whose line opens with the board at it.
const { data: desks } = useDesks()
const route = useRoute()
const focus = computed(() => (typeof route.query.desk === 'string' ? route.query.desk : undefined))
const chosen = ref<string>()
const line = computed(() =>
  lines.value?.find((l) => l.id === (chosen.value ?? desks.value?.desks.find((d) => d.id === focus.value)?.lineId)) ?? lines.value?.[0])
const layout = computed(() => live.value.signals.layout)
const linkOk = computed(() => !liveError.value && response.value?.signalsAge.ageSec != null && !response.value.signalsAge.stale)
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
      <CtcConsole
        v-if="line && layout?.controlPoints.length" :line="line" :lines="lines" :layout="layout" :live="live" :link-ok="linkOk"
        :dispatcher="user?.name ?? ''" :user-id="user?.id ?? ''" :controllable="canControl" :desks="desks?.desks ?? []" :focus="focus"
        @line="(id) => (chosen = id)"
      />
      <p v-else-if="response && !layout" class="text-sm text-muted-foreground">Waiting for the game server's signal layout. It's sent when the game loads a save, and every 10 minutes.</p>
      <p v-else-if="layout && !layout.controlPoints.length" class="text-sm text-muted-foreground">
        The game server's layout has no control points. Update the agent to 0.15 and the host mod to 0.7.0 or later.
      </p>
      <Skeleton v-else class="h-80 rounded-xl" />
    </template>

    <Skeleton v-else class="h-80 rounded-xl" />
  </PageBody>
</template>
