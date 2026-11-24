<script setup lang="ts">
import { ArrowUpRight, ExternalLink } from '@lucide/vue'

// The status page's overall status in the header; hovering lists each group's main components. Reads the status
// page's public summary (cached there for 60 seconds) once a minute. Hidden when no status page is configured.
const base = absoluteUrl(useRuntimeConfig().public.statusUrl as string)
const summary = ref<StatusSummary | null>(null)
const failed = ref(false)

async function refresh() {
  try {
    summary.value = await $fetch<StatusSummary>(`${base}/api/summary`)
    failed.value = false
  } catch {
    failed.value = true
  }
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (!base) return
  refresh()
  timer = setInterval(refresh, 60_000)
})
onBeforeUnmount(() => clearInterval(timer))

// The same words as the status page.
const OVERALL: Record<StatusLevel, string> = {
  operational: 'All systems operational',
  degraded: 'Some systems are degraded',
  partial_outage: 'Partial system outage',
  major_outage: 'Major system outage',
  maintenance: 'Maintenance in progress',
  paused: 'Paused',
  unknown: 'Status unknown'
}
const LABEL: Record<StatusLevel, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
  maintenance: 'Maintenance',
  paused: 'Paused',
  unknown: 'Unknown'
}
const DOT: Record<StatusLevel, string> = {
  operational: 'bg-emerald-500',
  degraded: 'bg-amber-400',
  partial_outage: 'bg-orange-500',
  major_outage: 'bg-red-500',
  maintenance: 'bg-sky-500',
  paused: 'bg-muted-foreground',
  unknown: 'bg-muted-foreground'
}
const level = (status: string): StatusLevel => (status in LABEL ? (status as StatusLevel) : 'unknown')
const overall = computed(() => (summary.value && !failed.value ? level(summary.value.overall) : 'unknown'))
// Always this setting, not the address the status page reports about itself: that one can be a leftover
// placeholder in the status page's config, and then the link goes nowhere.
const link = base
// Something wrong pulses, so it's noticed; all well, or unknown, stays still.
const alerting = computed(() => !['operational', 'unknown', 'paused'].includes(overall.value))
</script>

<template>
  <HoverCard v-if="base" :open-delay="150" :close-delay="150">
    <HoverCardTrigger as-child>
      <a :href="link" target="_blank" rel="noopener" :class="[HEADER_CONTROL, 'w-10 sm:w-auto sm:px-3.5']">
        <span class="relative grid size-2.5 place-items-center" aria-hidden="true">
          <span class="absolute inset-0 rounded-full opacity-35" :class="[DOT[overall], { 'animate-ping opacity-60 motion-reduce:animate-none': alerting }]" />
          <span class="relative size-1.5 rounded-full" :class="DOT[overall]" />
        </span>
        <span class="hidden sm:inline">{{ OVERALL[overall] }}</span>
        <ArrowUpRight class="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
        <span class="sr-only">Status: {{ OVERALL[overall] }}. Opens the status page.</span>
      </a>
    </HoverCardTrigger>
    <HoverCardContent align="end" :side-offset="6" class="w-72 rounded-xl">
      <p class="font-medium">{{ OVERALL[overall] }}</p>
      <p v-if="failed" class="mt-1 text-xs text-muted-foreground">Couldn't reach the status page just now.</p>
      <div v-for="group in summary?.groups ?? []" :key="group.name" class="mt-3 grid gap-1.5">
        <p class="text-xs text-muted-foreground">{{ group.name }}</p>
        <div v-for="c in group.components" :key="c.id" class="flex items-center justify-between gap-3 text-sm">
          <span class="flex items-center gap-2"><span class="size-2 shrink-0 rounded-full" :class="DOT[level(c.status)]" />{{ c.name }}</span>
          <span class="text-xs text-muted-foreground">{{ LABEL[level(c.status)] }}</span>
        </div>
      </div>
      <a :href="link" target="_blank" rel="noopener" class="mt-4 flex items-center gap-1.5 text-sm font-medium hover:underline">
        Open the status page <ExternalLink class="size-3.5" />
      </a>
    </HoverCardContent>
  </HoverCard>
</template>
