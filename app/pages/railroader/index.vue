<script setup lang="ts">
const { t } = useSite()
const { loaded, agents, detailed, error, forbidden } = useGameStatus<RailroaderAgent>('railroader')

const SESSION_TEXT: Record<string, string> = {
  menu: 'At the main menu (no save loaded)',
  loading: 'Loading a save',
  active: 'Session running',
  unloading: 'Closing the session'
}
const runningCount = computed(() => agents.value.filter((a) => a.railroader.process.status === 'online').length)
const ready = computed(() => loaded.value && !error.value && agents.value.length > 0)
</script>

<template>
  <StatusMessages
    :forbidden="forbidden" :error="!!error" :loaded="loaded" :empty="!agents.length"
    empty-title="No Railroader server reporting yet"
    empty-text="Turn on the railroader section in the server agent's agent.config.json and restart the agent."
  />

  <template v-if="ready">
    <StatusSummary :agents="agents">
      <Card>
        <CardHeader>
          <CardDescription>Game running</CardDescription>
          <CardTitle class="text-3xl tabular-nums">
            {{ runningCount }}<span class="text-lg font-normal text-muted-foreground"> / {{ agents.length }}</span>
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
          <div class="flex items-center gap-2">
            <StatusStaleBadge v-if="agent.stale" />
            <StatusPill
              :online="agent.railroader.process.status === 'online'" :stale="agent.stale"
              online-text="Running" offline-text="Not running"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent class="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <template v-if="agent.railroader.process.status === 'online'">
          <div>
            <div class="text-muted-foreground">Running for</div>
            <div class="font-medium">{{ formatDuration(agent.railroader.process.uptimeSec) }}</div>
          </div>
          <template v-if="agent.railroader.api?.reachable">
            <div>
              <div class="text-muted-foreground">Session</div>
              <div class="font-medium">{{ SESSION_TEXT[agent.railroader.api.sessionState ?? ''] ?? 'Unknown' }}</div>
            </div>
            <div v-if="agent.railroader.api.railroadName">
              <div class="text-muted-foreground">Railroad</div>
              <div class="font-medium">{{ agent.railroader.api.railroadName }}</div>
            </div>
            <StatusJoinCode
              v-if="agent.railroader.multiplayer && agent.railroader.api.sessionState === 'active'"
              :code="agent.railroader.multiplayer.joinCode"
            />
            <div v-if="agent.railroader.api.gameMode">
              <div class="text-muted-foreground">Game mode</div>
              <div class="font-medium">{{ agent.railroader.api.gameMode }}</div>
            </div>
            <div v-if="agent.railroader.api.gameVersion">
              <div class="text-muted-foreground">Game version</div>
              <div class="font-medium">{{ agent.railroader.api.gameVersion }}</div>
            </div>
          </template>
          <div v-else class="sm:col-span-2 lg:col-span-3">
            <div class="text-muted-foreground">Session</div>
            <div class="font-medium">Not available</div>
            <div class="text-muted-foreground">
              The game is running but its local API isn't answering. Turn on HTTP Server in the game's Experimental preferences.
              <template v-if="detailed && agent.railroader.api?.error"> ({{ agent.railroader.api.error }})</template>
            </div>
          </div>
          <template v-if="detailed">
            <div>
              <div class="text-muted-foreground">CPU</div>
              <div class="font-medium tabular-nums">{{ agent.railroader.process.cpuPct != null ? `${agent.railroader.process.cpuPct}%` : '—' }}</div>
            </div>
            <div>
              <div class="text-muted-foreground">Memory</div>
              <div class="font-medium tabular-nums">{{ agent.railroader.process.memMb != null ? `${agent.railroader.process.memMb} MB` : '—' }}</div>
            </div>
          </template>
        </template>
        <div v-else class="text-muted-foreground sm:col-span-2 lg:col-span-4">The Railroader game isn't running on this server.</div>
      </CardContent>
    </Card>
  </template>
</template>
