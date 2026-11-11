<script setup lang="ts">
const { data, error, refresh } = await useFetch<StatusResponse>('/api/status')

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(refresh, 15_000) })
onBeforeUnmount(() => clearInterval(timer))

const { t } = useSite()
const detailed = computed(() => data.value?.detailed ?? false)
const forbidden = computed(() => error.value?.statusCode === 403)
const agents = computed(() => data.value?.agents ?? [])
const allRoutes = computed(() => agents.value.flatMap((a) => a.routes))
const onlineCount = computed(() => allRoutes.value.filter((r) => r.status === 'online').length)
const anyStale = computed(() => agents.value.some((a) => a.stale))
</script>

<template>
  <div class="space-y-8">
    <div class="space-y-1">
      <h1 class="text-3xl font-semibold">{{ t('pageTitle') }}</h1>
      <p v-if="agents.length" class="text-muted">
        {{ onlineCount }} of {{ allRoutes.length }} {{ t('routes').toLowerCase() }} running
        <template v-if="anyStale"> (data may be out of date)</template>
      </p>
    </div>

    <UAlert
      v-if="forbidden"
      color="neutral"
      variant="subtle"
      title="Your role can't view this page"
      description="Ask an admin to update your access."
    />

    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      title="Can't load route status"
      description="Refresh the page. If it keeps happening, tell an admin."
    />

    <UAlert
      v-else-if="!agents.length"
      color="neutral"
      variant="subtle"
      title="Waiting for the first report"
      description="The server agent hasn't sent any data yet. Check that it's running and that its dashboard address and key match."
    />

    <section v-for="agent in agents" :key="agent.agentId" class="space-y-4">
      <UAlert
        v-if="agent.stale"
        color="warning"
        variant="subtle"
        title="The server agent has gone quiet"
        :description="`Last update ${formatAge(agent.ageSec)}. Route statuses below may be out of date.`"
      />

      <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm text-muted">
        <h2 class="text-base font-semibold text-default">{{ t('server') }}: {{ agent.agentId }}</h2>
        <span>
          Updated {{ formatAge(agent.ageSec) }}
          <template v-if="agent.system">
            · CPU {{ agent.system.cpuPct }}% · Memory {{ Math.round(agent.system.memUsedMb / 1024) }} of
            {{ Math.round(agent.system.memTotalMb / 1024) }} GB
          </template>
        </span>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RouteCard
          v-for="r in agent.routes"
          :key="r.port"
          :route="r"
          :stale="agent.stale"
          :detailed="detailed"
        />
      </div>

      <UAlert
        v-if="detailed && agent.unmapped.length"
        color="warning"
        variant="subtle"
        title="Run8 is listening on a port that isn't set up here"
        :description="`Port ${agent.unmapped.map((u) => u.port).join(', ')}. Add it to agent.config.json to show it as a route, or add it to ignorePorts.`"
      />
    </section>
  </div>
</template>
