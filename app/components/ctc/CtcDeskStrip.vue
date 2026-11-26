<script setup lang="ts">
// A line's desks as one bar, as boards F and H draw it: each desk's stretch with who's on it, the towns where desks
// meet, and trains as dots where they are now. Positions are the CTC board's (ctcBoard.ts), as shares of its width.
const props = defineProps<{ board: Board; desks: BoardDesk[]; trains?: BoardTrain[] }>()

const share = (x: number) => `${(x / props.board.width) * 100}%`
// Where each desk starts and where the line ends, with the milepost; a mark too close to the one before is left out.
const ROOM = 0.07 // of the width
const marks = computed(() => {
  const all = [
    ...props.desks.map((d) => ({ x: d.x1, name: d.from, milepost: milepostAt(props.board, d.starts) })),
    { x: props.board.width, name: props.board.towns.at(-1)?.name ?? '', milepost: milepostAt(props.board, props.board.width) }
  ]
  return all.filter((m, k) => k === 0 || k === all.length - 1 || (m.x - all[k - 1]!.x >= ROOM * props.board.width && all.at(-1)!.x - m.x >= ROOM * props.board.width))
})
const roomy = (d: BoardDesk) => d.x2 - d.x1 >= ROOM * props.board.width
</script>

<template>
  <div class="grid gap-1.5">
    <div class="relative h-5 text-sm">
      <span
        v-for="d in desks" :key="d.id" class="absolute truncate px-2 font-medium"
        :style="{ left: share(d.x1), width: share(d.x2 - d.x1) }"
        :title="`${d.name}: ${d.mine ? 'you' : d.holder ?? 'open'}`"
      ><template v-if="roomy(d)">{{ d.name }} <span class="font-normal text-muted-foreground">{{ d.mine ? 'you' : d.holder ?? 'open' }}</span></template></span>
    </div>
    <div class="relative h-3">
      <span
        v-for="d in desks" :key="d.id" class="absolute inset-y-0 border-x-2 border-background first:rounded-l-full last:rounded-r-full"
        :class="d.mine ? 'bg-sky-500' : d.holder ? 'bg-foreground/60' : 'bg-muted-foreground/25'"
        :style="{ left: share(d.x1), width: share(d.x2 - d.x1) }"
      />
      <span
        v-for="t in trains" :key="t.id" :title="t.name"
        class="absolute top-1/2 size-2.5 -translate-1/2 rounded-full border-2 border-background bg-red-500"
        :style="{ left: share(t.x) }"
      />
    </div>
    <div class="relative h-9 text-xs text-muted-foreground">
      <span
        v-for="(m, k) in marks" :key="m.name" class="absolute whitespace-nowrap"
        :style="{ left: share(m.x), transform: k === 0 ? 'none' : k === marks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }"
      >
        <span class="block font-medium text-foreground">{{ m.name }}</span>MP {{ m.milepost.toFixed(1) }}
      </span>
    </div>
  </div>
</template>
