<script setup lang="ts">
// The console's TRAIN column, as board E shows it, for the train clicked on the board. Symbols, tons and length
// aren't shown: the game doesn't give them to the board yet.
const props = defineProps<{ train?: BoardTrain; board: Board }>()

const ASPECT: Record<SignalAspect, string> = {
  stop: 'STOP', approach: 'APPROACH', divergingApproach: 'DIVERGING APPROACH', clear: 'CLEAR', divergingClear: 'DIVERGING CLEAR', restricting: 'RESTRICTING', unknown: 'NOT REPORTED'
}
const names = computed(() => new Map(props.board.points.map((p) => [p.id, p.name.toUpperCase()])))
const end = (right: boolean) => (right ? props.board.towns.at(-1) : props.board.towns[0])?.name.toUpperCase()
const where = (t: BoardTrain) => `${t.place.toUpperCase()}${t.track === 'line' ? '' : `, ${t.track.toUpperCase()}`}`
</script>

<template>
  <section aria-labelledby="ctc-train" class="min-w-0 flex-[1_1_300px]">
    <h2 id="ctc-train" class="border-b border-[#1f1f1f] px-3 py-1.5 text-sm font-bold text-neutral-400">TRAIN</h2>
    <div v-if="train" class="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5 text-[15px]">
      <div class="col-span-2 text-xl font-bold tracking-[.05em] text-yellow-300">{{ train.name }}</div>
      <div><div class="text-[13px] text-neutral-400">DIRECTION</div>TOWARD {{ end(train.right) }}</div>
      <div><div class="text-[13px] text-neutral-400">SPEED</div>{{ Math.round(train.speedMph) }} MPH</div>
      <div><div class="text-[13px] text-neutral-400">CARS</div>{{ train.cars }}</div>
      <div class="col-span-2"><div class="text-[13px] text-neutral-400">LOCATION</div>{{ where(train) }}</div>
      <div class="col-span-2">
        <div class="text-[13px] text-neutral-400">NEXT SIGNAL</div>
        <template v-if="train.next">{{ train.next.cp ? names.get(train.next.cp) : 'INTERMEDIATE' }} {{ train.next.signal.toUpperCase() }}, {{ ASPECT[train.next.aspect] }}</template>
        <template v-else>NONE BEFORE THE END OF THE LINE</template>
      </div>
    </div>
    <p v-else class="px-3 py-2.5 text-[15px] text-neutral-500">CLICK A TRAIN ON THE BOARD.</p>
  </section>
</template>
