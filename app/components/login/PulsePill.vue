<script setup lang="ts">
import { Moon, Server, TrainFront } from '@lucide/vue'

// One thing happening on the servers, for the sign-in page: a train, a signal or a game, with its icon.
defineProps<{ card: PulseCard }>()
const palette = useMapPalette()
</script>

<template>
  <div class="flex items-center gap-3 rounded-xl border bg-card/90 py-2.5 pr-4 pl-2.5 text-card-foreground shadow-sm backdrop-blur-sm">
    <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
      <TrainFront v-if="card.kind === 'train'" class="size-4" :style="{ color: palette.train }" />
      <span v-else-if="card.aspect" class="size-3 rounded-full" :style="{ background: palette.aspects[card.aspect] }" />
      <Moon v-else-if="card.kind === 'quiet'" class="size-4 text-muted-foreground" />
      <Server v-else class="size-4 text-muted-foreground" />
    </span>
    <span class="grid min-w-0">
      <span class="truncate text-sm font-medium">{{ card.title }}</span>
      <span class="truncate text-xs text-muted-foreground">{{ card.detail }}</span>
    </span>
  </div>
</template>
