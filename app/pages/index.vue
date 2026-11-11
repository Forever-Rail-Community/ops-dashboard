<script setup lang="ts">
import { CircleAlert, TriangleAlert } from '@lucide/vue'

const { data, error, refresh } = await useFetch<StatusResponse>('/api/status')

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(refresh, 15_000) })
onBeforeUnmount(() => clearInterval(timer))

const { t } = useSite()
const detailed = computed(() => data.value?.detailed ?? false)
const agents = computed(() => data.value?.agents ?? [])
const allRoutes = computed(() => agents.value.flatMap((a) => a.routes))
const onlineCount = computed(() => allRoutes.value.filter((r) => r.status === 'online').length)
const anyStale = computed(() => agents.value.some((a) => a.stale))
const forbidden = computed(() => error.value?.statusCode === 403)
const freshest = computed(() => (agents.value.length ? Math.min(...agents.value.map((a) => a.ageSec)) : null))
const firstSystem = computed(() => agents.value.find((a) => a.system)?.system ?? null)
</script>

<template>
  <div class="flex flex-col gap-6">
    <Alert v-if="forbidden">
      <CircleAlert />
      <AlertTitle>Your role can't view this page</AlertTitle>
      <AlertDescription>Ask an admin to update your access.</AlertDescription>
    </Alert>

    <Alert v-else-if="error" variant="destructive">
      <CircleAlert />
      <AlertTitle>Can't load {{ t('routes').toLowerCase() }}</AlertTitle>
      <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
    </Alert>

    <Alert v-else-if="!agents.length">
      <CircleAlert />
      <AlertTitle>Waiting for the first report</AlertTitle>
      <AlertDescription>
        The server agent hasn't sent any data yet. Check that it's running and that its dashboard address and key match.
      </AlertDescription>
    </Alert>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2" :class="firstSystem ? 'xl:grid-cols-4' : 'xl:grid-cols-3'">
        <Card>
          <CardHeader>
            <CardDescription>{{ t('routes') }} running</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ onlineCount }}<span class="text-lg font-normal text-muted-foreground"> / {{ allRoutes.length }}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Last update</CardDescription>
            <CardTitle class="text-3xl">{{ freshest !== null ? formatAge(freshest) : '—' }}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Server agent</CardDescription>
            <CardTitle class="text-3xl">{{ anyStale ? 'Quiet' : 'Connected' }}</CardTitle>
          </CardHeader>
        </Card>
        <Card v-if="firstSystem">
          <CardHeader>
            <CardDescription>Server load</CardDescription>
            <CardTitle class="text-3xl tabular-nums">
              {{ firstSystem.cpuPct }}%
              <span class="text-lg font-normal text-muted-foreground">
                CPU · {{ Math.round(firstSystem.memUsedMb / 1024) }}/{{ Math.round(firstSystem.memTotalMb / 1024) }} GB
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card v-for="agent in agents" :key="agent.agentId">
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{{ t('server') }}: {{ agent.agentId }}</CardTitle>
              <CardDescription>Updated {{ formatAge(agent.ageSec) }}</CardDescription>
            </div>
            <Badge v-if="agent.stale" variant="outline" class="border-amber-600/40 text-amber-800">
              <TriangleAlert />
              Agent has gone quiet
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t('route') }}</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Running for</TableHead>
                <template v-if="detailed">
                  <TableHead class="text-right">CPU</TableHead>
                  <TableHead class="text-right">Memory</TableHead>
                  <TableHead class="text-right">PID</TableHead>
                </template>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="r in agent.routes" :key="r.port">
                <TableCell class="font-medium">{{ r.name }}</TableCell>
                <TableCell class="tabular-nums text-muted-foreground">{{ r.port }}</TableCell>
                <TableCell>
                  <Badge
                    v-if="r.status === 'online'"
                    variant="outline"
                    class="gap-1.5 border-emerald-600/30 bg-emerald-50 text-emerald-800"
                  >
                    <span class="size-1.5 rounded-full bg-emerald-600" />
                    {{ agent.stale ? 'Last known: online' : 'Online' }}
                  </Badge>
                  <Badge v-else variant="secondary" class="gap-1.5">
                    <span class="size-1.5 rounded-full bg-muted-foreground" />
                    {{ agent.stale ? 'Last known: offline' : 'Offline' }}
                  </Badge>
                </TableCell>
                <TableCell>{{ r.status === 'online' ? formatDuration(r.uptimeSec) : 'Not running' }}</TableCell>
                <template v-if="detailed">
                  <TableCell class="text-right tabular-nums">{{ r.status === 'online' && r.cpuPct != null ? `${r.cpuPct}%` : '—' }}</TableCell>
                  <TableCell class="text-right tabular-nums">{{ r.status === 'online' && r.memMb != null ? `${r.memMb} MB` : '—' }}</TableCell>
                  <TableCell class="text-right tabular-nums text-muted-foreground">{{ r.status === 'online' ? (r.pid ?? '—') : '—' }}</TableCell>
                </template>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert v-for="agent in agents.filter((a) => detailed && a.unmapped.length)" :key="agent.agentId + '-unmapped'">
        <TriangleAlert />
        <AlertTitle>Run8 is listening on a port that isn't set up here</AlertTitle>
        <AlertDescription>
          Port {{ agent.unmapped.map((u) => u.port).join(', ') }}. Add it to agent.config.json to show it as a route, or add it to ignorePorts.
        </AlertDescription>
      </Alert>
    </template>
  </div>
</template>
