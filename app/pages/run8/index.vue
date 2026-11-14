<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'

const { t } = useSite()
const { loaded, agents, detailed, error, forbidden } = useGameStatus<Run8Agent>('run8')

const routes = computed(() => agents.value.flatMap((a) => a.routes))
const onlineCount = computed(() => routes.value.filter((r) => r.status === 'online').length)
const ready = computed(() => loaded.value && !error.value && agents.value.length > 0)
</script>

<template>
  <StatusMessages
    :forbidden="forbidden" :error="!!error" :loaded="loaded" :empty="!agents.length"
    empty-title="No Run8 servers reporting yet"
    empty-text="Check that the server agent is running and has routes listed in agent.config.json."
  />

  <template v-if="ready">
    <StatusSummary :agents="agents">
      <Card>
        <CardHeader>
          <CardDescription>{{ t('routes') }} running</CardDescription>
          <CardTitle class="text-3xl tabular-nums">
            {{ onlineCount }}<span class="text-lg font-normal text-muted-foreground"> / {{ routes.length }}</span>
          </CardTitle>
        </CardHeader>
      </Card>
    </StatusSummary>

    <Card v-for="agent in agents" :key="agent.agentId">
      <CardHeader>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{{ t('server') }}: {{ agent.agentId }}</CardTitle>
            <CardDescription>Updated {{ formatAge(agent.ageSec) }}</CardDescription>
          </div>
          <StatusStaleBadge v-if="agent.stale" />
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
                <StatusPill :online="r.status === 'online'" :stale="agent.stale" online-text="Online" offline-text="Offline" />
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

    <Alert v-for="agent in agents.filter((a) => a.unmapped.length)" :key="agent.agentId + '-unmapped'">
      <TriangleAlert />
      <AlertTitle>Run8 is listening on a port that isn't set up here</AlertTitle>
      <AlertDescription>
        Port {{ agent.unmapped.map((u) => u.port).join(', ') }}. Add it to agent.config.json to show it as a route, or add it to ignorePorts.
      </AlertDescription>
    </Alert>
  </template>
</template>
