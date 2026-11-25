<script setup lang="ts">
// The console's EVENTS column, as board E shows it: what changed at the control points while the board is open
// (a signal cleared or put to stop, a switch lined), newest first. Kept in the page only.
const props = defineProps<{ board: Board; aspects: Record<string, SignalAspect>; thrown: Record<string, boolean> }>()

const KEEP = 12
interface ConsoleEvent { at: string; text: string; color: string }
const events = ref<ConsoleEvent[]>([])
const names = computed(() => new Map(props.board.points.map((p) => [p.id, p.name.toUpperCase()])))
const add = (text: string, color: string) => {
  events.value = [{ at: commandTime(new Date().toISOString()), text, color }, ...events.value].slice(0, KEEP)
}

watch(() => ({ ...props.aspects }), (now, before) => {
  if (!before || !Object.keys(before).length) return
  for (const h of props.board.heads) {
    if (h.intermediate || !h.cp || !(h.signal in before) || now[h.signal] === before[h.signal]) continue
    const cleared = now[h.signal] !== 'stop'
    if (cleared === (before[h.signal] !== 'stop')) continue
    add(`${names.value.get(h.cp)} ${h.signal.toUpperCase()} ${cleared ? 'CLEARED' : 'AT STOP'}`, cleared ? '#4ade80' : '#e5e5e5')
  }
})
watch(() => ({ ...props.thrown }), (now, before) => {
  if (!before || !Object.keys(before).length) return
  for (const p of props.board.points) {
    if (!p.switch || !(p.switch in before) || now[p.switch] === before[p.switch]) continue
    add(`SWITCH AT ${p.name.toUpperCase()} LINED ${now[p.switch] ? 'REVERSE' : 'NORMAL'}`, now[p.switch] ? '#facc15' : '#e5e5e5')
  }
})
</script>

<template>
  <section aria-labelledby="ctc-events" class="min-w-0 flex-[2_1_380px] border-r border-[#2a2a2a]">
    <h2 id="ctc-events" class="border-b border-[#1f1f1f] px-3 py-1.5 text-sm font-bold text-neutral-400">EVENTS</h2>
    <ol class="py-1 text-[15px]">
      <li v-for="(e, k) in events" :key="k" class="grid grid-cols-[76px_1fr] gap-2 px-3 py-[3px]">
        <span class="text-neutral-400">{{ e.at }}</span><span :style="{ color: e.color }">{{ e.text }}</span>
      </li>
      <li v-if="!events.length" class="px-3 py-[3px] text-neutral-500">SIGNALS AND SWITCHES THAT CHANGE WHILE THE BOARD IS OPEN SHOW HERE.</li>
    </ol>
  </section>
</template>
