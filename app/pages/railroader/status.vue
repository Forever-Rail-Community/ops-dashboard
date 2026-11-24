<script setup lang="ts">
import { Activity, Server } from '@lucide/vue'

const { t } = useSite()
const { loaded, agents, detailed, error, forbidden } = useGameStatus<RailroaderAgent>('railroader')

const SESSION_TEXT: Record<string, string> = {
  menu: 'At the main menu (no save loaded)',
  loading: 'Loading a save',
  active: 'Running',
  unloading: 'Closing the session'
}
const isRunning = (a: RailroaderAgent) => a.railroader.process.status === 'online'
const runningCount = computed(() => agents.value.filter(isRunning).length)
const ready = computed(() => loaded.value && !error.value && agents.value.length > 0)
</script>

<template>
  <PageBody>
    <PageHeader title="Game status" description="How the Railroader server is running. For staff." />

    <StatusMessages
      :forbidden="forbidden" :error="!!error" :loaded="loaded" :empty="!agents.length"
      empty-title="No Railroader server reporting yet"
      empty-text="Turn on the railroader section in the server agent's agent.config.json and restart the agent."
    />

    <template v-if="ready">
      <StatusSummary :agents="agents">
        <PageStatCard :icon="Activity" label="Game running">
          <span class="text-[26px] font-semibold tabular-nums">{{ runningCount }} / {{ agents.length }}</span>
          <template #detail>
            <span :class="runningCount === agents.length ? 'text-emerald-600 dark:text-emerald-300' : ''">
              {{ runningCount === agents.length ? 'Every server is running the game' : `${agents.length - runningCount} not running` }}
            </span>
          </template>
        </PageStatCard>
      </StatusSummary>

      <PageSection
        v-for="agent in agents" :key="agent.agentId"
        :icon="Server" :title="`${t('server')}: ${agent.agentId}`"
        description="The game, its session and what it uses on the server machine."
      >
        <template #action>
          <span class="flex items-center gap-2">
            <StatusStaleBadge v-if="agent.stale" />
            <StatusPill :online="isRunning(agent)" :stale="agent.stale" online-text="Running" offline-text="Not running" />
          </span>
        </template>
        <div class="grid gap-x-6 gap-y-4 border-t pt-3.5 pb-3 [grid-template-columns:repeat(auto-fill,minmax(140px,1fr))]">
          <template v-if="isRunning(agent)">
            <StatusDetail label="Running for">{{ formatDuration(agent.railroader.process.uptimeSec) }}</StatusDetail>
            <template v-if="agent.railroader.api?.reachable">
              <StatusDetail label="Session">{{ SESSION_TEXT[agent.railroader.api.sessionState ?? ''] ?? 'Unknown' }}</StatusDetail>
              <StatusDetail v-if="agent.railroader.api.railroadName" label="Railroad">{{ agent.railroader.api.railroadName }}</StatusDetail>
              <StatusJoinCode
                v-if="agent.railroader.multiplayer && agent.railroader.api.sessionState === 'active'"
                :code="agent.railroader.multiplayer.joinCode"
              />
              <StatusDetail v-if="agent.railroader.api.gameMode" label="Game mode">{{ agent.railroader.api.gameMode }}</StatusDetail>
              <StatusDetail v-if="agent.railroader.api.gameVersion" label="Game version">{{ agent.railroader.api.gameVersion }}</StatusDetail>
            </template>
            <div v-else class="col-span-full text-sm">
              <div class="font-medium">The game is running, but its session isn't available</div>
              <div class="text-muted-foreground">
                Its local API isn't answering. Turn on HTTP Server in the game's Experimental preferences.
                <template v-if="detailed && agent.railroader.api?.error"> ({{ agent.railroader.api.error }})</template>
              </div>
            </div>
            <template v-if="detailed">
              <StatusDetail label="CPU"><span class="tabular-nums">{{ agent.railroader.process.cpuPct != null ? `${agent.railroader.process.cpuPct}%` : '—' }}</span></StatusDetail>
              <StatusDetail label="Memory"><span class="tabular-nums">{{ agent.railroader.process.memMb != null ? `${agent.railroader.process.memMb} MB` : '—' }}</span></StatusDetail>
              <StatusDetail label="Process ID"><span class="tabular-nums">{{ agent.railroader.process.pid ?? '—' }}</span></StatusDetail>
            </template>
          </template>
          <div v-else class="col-span-full text-sm text-muted-foreground">The Railroader game isn't running on this server.</div>
        </div>
      </PageSection>
    </template>
  </PageBody>
</template>
