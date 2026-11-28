<script setup lang="ts">
// The board's alerts (app/utils/ctcAlerts.ts) as rows under the board, as board K shows them: Show moves the board to
// the signal, Silence hides that signal's alerts for SILENCE_MIN minutes. A switch released for hand throwing is an
// alert too, until it's locked: the game holds its switch block occupied meanwhile. Lock sends the lock command where
// this dispatcher works the control point. With the line's sound on (Edit desks), a new
// alert chimes.
import { useIntervalFn } from '@vueuse/core'

const props = defineProps<{ alerts: CtcAlert[]; released: { cp: string; x: number; canLock: boolean }[]; names: Map<string, string>; sound?: boolean }>()
const emit = defineEmits<{ show: [x: number]; lock: [cp: string] }>()

const SILENCE_MIN = 10
const silencedUntil = reactive(new Map<string, number>())
const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 15_000)
const shown = computed(() => props.alerts.filter((a) => (silencedUntil.get(a.signal) ?? 0) < now.value).sort((a, b) => b.since - a.since))
const minutes = (since: number) => Math.max(0, Math.floor((now.value - since) / 60_000))
const silence = (signal: string) => silencedUntil.set(signal, Date.now() + SILENCE_MIN * 60_000)
const key = (a: CtcAlert) => `${a.signal}${a.train}`
watch(() => [...shown.value.map(key), ...props.released.map((r) => r.cp)], (keys, before) => {
  if (props.sound && before && keys.some((k) => !before.includes(k))) chime()
})
</script>

<template>
  <div role="status">
    <div
      v-for="r in released" :key="`r${r.cp}`"
      class="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1.5 border-b border-l-[3px] border-b-[#2a2a2a] border-l-amber-500 bg-[#1a1206] px-3.5 py-1.5 font-[Barlow] text-[15px] tracking-normal"
    >
      <span>
        <b class="font-['Barlow_Condensed'] font-bold tracking-[.03em] text-amber-400">&#9888; SWITCH RELEASED</b>
        The switch at {{ (names.get(r.cp) ?? r.cp).toUpperCase() }} is released for hand throwing. Its switch block stays occupied, and its signals can't clear, until the switch is locked.
      </span>
      <span class="inline-flex gap-1.5">
        <button type="button" class="h-[22px] border border-amber-300 px-2 font-['Barlow_Condensed'] text-[13px] font-bold tracking-[.03em] text-amber-300" @click="emit('show', r.x)">SHOW</button>
        <button v-if="r.canLock" type="button" class="h-[22px] border border-neutral-300 px-2 font-['Barlow_Condensed'] text-[13px] font-bold tracking-[.03em] text-neutral-200" @click="emit('lock', r.cp)">LOCK SWITCH</button>
      </span>
    </div>
    <div
      v-for="a in shown" :key="key(a)"
      class="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1.5 border-b border-l-[3px] border-b-[#2a2a2a] border-l-red-500 bg-[#1a0606] px-3.5 py-1.5 font-[Barlow] text-[15px] tracking-normal"
    >
      <span>
        <b class="font-['Barlow_Condensed'] font-bold tracking-[.03em] text-red-400">&#9888; ALERT</b>
        {{ a.train }}
        is stopped at {{ (names.get(a.cp) ?? a.cp).toUpperCase() }} ({{ a.signal }}), waiting on a signal at stop<template v-if="a.waiting"> for <b>{{ minutes(a.since) }} min</b></template>.
      </span>
      <span class="inline-flex gap-1.5">
        <button type="button" class="h-[22px] border border-red-300 px-2 font-['Barlow_Condensed'] text-[13px] font-bold tracking-[.03em] text-red-300" @click="emit('show', a.x)">SHOW</button>
        <button type="button" class="h-[22px] border border-neutral-400 px-2 font-['Barlow_Condensed'] text-[13px] font-bold tracking-[.03em] text-neutral-400" @click="silence(a.signal)">SILENCE {{ SILENCE_MIN }} MIN</button>
      </span>
    </div>
  </div>
</template>
