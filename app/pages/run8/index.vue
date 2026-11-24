<script setup lang="ts">
import { Route, TriangleAlert } from '@lucide/vue'

const { t } = useSite()
const { loaded, agents, detailed, error, forbidden } = useGameStatus<Run8Agent>('run8')

const routes = computed(() => agents.value.flatMap((a) => a.routes))
const onlineCount = computed(() => routes.value.filter((r) => r.status === 'online').length)
const ready = computed(() => loaded.value && !error.value && agents.value.length > 0)

function routeDetail(r: RouteReport) {
  if (r.status !== 'online') return `Port ${r.port}, not running`
  return r.uptimeSec != null ? `Port ${r.port}, running for ${formatDuration(r.uptimeSec)}` : `Port ${r.port}`
}
function routeUse(r: RouteReport) {
  if (r.status !== 'online') return ''
  return [r.cpuPct != null ? `CPU ${r.cpuPct}%` : '', r.memMb != null ? `${(r.memMb / 1024).toFixed(1)} GB` : '', r.pid ? `PID ${r.pid}` : '']
    .filter(Boolean).join(', ')
}
</script>

<template>
  <PageBody>
    <PageHeader :title="`${t('route')} status`" :description="`Which Run8 ${t('routes').toLowerCase()} are running on the server. For staff.`" />

    <StatusMessages
      :forbidden="forbidden" :error="!!error" :loaded="loaded" :empty="!agents.length"
      empty-title="No Run8 servers reporting yet"
      empty-text="Check that the server agent is running and has routes listed in agent.config.json."
    />

    <template v-if="ready">
      <StatusSummary :agents="agents">
        <PageStatCard :icon="Route" :label="`${t('routes')} running`">
          <span class="text-[26px] font-semibold tabular-nums">{{ onlineCount }} / {{ routes.length }}</span>
          <template #detail>
            <span :class="onlineCount === routes.length ? 'text-emerald-600 dark:text-emerald-300' : ''">
              {{ onlineCount === routes.length ? `All ${t('routes').toLowerCase()} are up` : `${routes.length - onlineCount} down` }}
            </span>
          </template>
        </PageStatCard>
      </StatusSummary>

      <PageSection
        v-for="agent in agents" :key="agent.agentId"
        :icon="Route" :title="`${t('routes')} on ${agent.agentId}`" :count="agent.routes.length"
        :description="`Each Run8 ${t('route').toLowerCase()} this server hosts, and whether it's up.`"
      >
        <template #action><StatusStaleBadge v-if="agent.stale" /></template>
        <PageRow v-for="r in agent.routes" :key="r.port" :title="r.name" :detail="routeDetail(r)">
          <template #trailing>
            <span class="flex items-center gap-2">
              <span v-if="detailed && routeUse(r)" class="hidden text-[13px] whitespace-nowrap text-muted-foreground tabular-nums sm:inline">{{ routeUse(r) }}</span>
              <StatusPill :online="r.status === 'online'" :stale="agent.stale" online-text="Online" offline-text="Offline" />
            </span>
          </template>
        </PageRow>
        <template #empty>No {{ t('routes').toLowerCase() }} set up in agent.config.json.</template>
      </PageSection>

      <Alert v-for="agent in agents.filter((a) => a.unmapped.length)" :key="agent.agentId + '-unmapped'">
        <TriangleAlert />
        <AlertTitle>Run8 is listening on a port that isn't set up here</AlertTitle>
        <AlertDescription>
          Port {{ agent.unmapped.map((u) => u.port).join(', ') }}. Add it to agent.config.json to show it as a route, or add it to ignorePorts.
        </AlertDescription>
      </Alert>
    </template>
  </PageBody>
</template>
