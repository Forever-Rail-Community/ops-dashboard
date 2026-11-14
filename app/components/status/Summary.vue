<script setup lang="ts">
// The row of figure cards at the top of a game's status page. A game can put its own card first through the slot.
const props = defineProps<{ agents: AgentBase[] }>()

const freshest = computed(() => (props.agents.length ? Math.min(...props.agents.map((a) => a.ageSec)) : null))
const anyStale = computed(() => props.agents.some((a) => a.stale))
const system = computed(() => props.agents.find((a) => a.system)?.system ?? null)
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <slot />
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
    <Card v-if="system">
      <CardHeader>
        <CardDescription>Server load</CardDescription>
        <CardTitle class="text-3xl tabular-nums">
          {{ system.cpuPct }}%
          <span class="text-lg font-normal text-muted-foreground">
            CPU · {{ Math.round(system.memUsedMb / 1024) }}/{{ Math.round(system.memTotalMb / 1024) }} GB
          </span>
        </CardTitle>
      </CardHeader>
    </Card>
  </div>
</template>
