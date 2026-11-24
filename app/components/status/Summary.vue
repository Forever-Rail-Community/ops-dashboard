<script setup lang="ts">
import { Cpu, Server } from '@lucide/vue'

// The figure cards at the top of a game's status page. The game puts its own card first through the slot.
const props = defineProps<{ agents: AgentBase[] }>()

const freshest = computed(() => (props.agents.length ? Math.min(...props.agents.map((a) => a.ageSec)) : null))
const anyStale = computed(() => props.agents.some((a) => a.stale))
const names = computed(() => props.agents.map((a) => a.agentId).join(', '))
const system = computed(() => props.agents.find((a) => a.system)?.system ?? null)
</script>

<template>
  <PageGrid :min="240">
    <slot />
    <PageStatCard :icon="Server" label="Connection">
      <span class="text-[26px] font-semibold">{{ anyStale ? 'Quiet' : 'Reporting' }}</span>
      <template #detail>
        <span :class="anyStale ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'">
          {{ names }}, last report {{ freshest !== null ? formatAge(freshest) : 'never' }}
        </span>
      </template>
    </PageStatCard>
    <PageStatCard v-if="system" :icon="Cpu" label="Server load">
      <span class="text-[26px] font-semibold tabular-nums">{{ system.cpuPct }}%</span>
      <template #detail>
        CPU, with {{ Math.round(system.memUsedMb / 1024) }} of {{ Math.round(system.memTotalMb / 1024) }} GB memory in use
      </template>
    </PageStatCard>
  </PageGrid>
</template>
