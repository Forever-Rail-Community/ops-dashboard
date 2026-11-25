<script setup lang="ts">
// The board's alerts (app/utils/ctcAlerts.ts), newest first: Show moves the board to the signal, Silence hides that
// signal's alerts for SILENCE_MIN minutes.
import { useIntervalFn } from '@vueuse/core'

const props = defineProps<{ alerts: CtcAlert[]; names: Map<string, string> }>()
const emit = defineEmits<{ show: [x: number] }>()

const SILENCE_MIN = 10
const silencedUntil = reactive(new Map<string, number>())
const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 15_000)
const shown = computed(() => props.alerts.filter((a) => (silencedUntil.get(a.signal) ?? 0) < now.value).sort((a, b) => b.since - a.since))
const minutes = (since: number) => Math.max(0, Math.floor((now.value - since) / 60_000))
const silence = (signal: string) => silencedUntil.set(signal, Date.now() + SILENCE_MIN * 60_000)
</script>

<template>
  <section v-if="shown.length" class="grid gap-2" aria-label="Alerts" role="status">
    <div v-for="a in shown" :key="`${a.signal}${a.train}`" class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2.5 text-sm">
      <span class="font-semibold text-amber-800 dark:text-amber-300">{{ a.waiting ? 'Waiting' : 'Approaching' }}</span>
      <span class="min-w-0 flex-1">
        <b>{{ a.train }}</b>
        <template v-if="a.waiting"> has been stopped at </template><template v-else> is heading for </template>
        <b>{{ names.get(a.cp) ?? a.cp }}</b> ({{ a.signal }}), signal at stop<template v-if="a.waiting">, for {{ minutes(a.since) }} min</template>.
      </span>
      <Button size="sm" variant="outline" @click="emit('show', a.x)">Show</Button>
      <Button size="sm" variant="ghost" @click="silence(a.signal)">Silence {{ SILENCE_MIN }} min</Button>
    </div>
  </section>
</template>
