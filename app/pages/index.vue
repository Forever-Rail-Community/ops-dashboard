<script setup lang="ts">
import { ArrowRight, Gamepad2 } from '@lucide/vue'

// The game picker. Shown the first time; after that, "/" goes straight to the last game chosen (see the auth middleware).
definePageMeta({ title: 'Choose a game' })

const { user } = useUserSession()
// Each game's state right now, from the same public feed as the sign-in page.
const { data: pulse } = useFetch<Pulse>('/api/public/pulse', { server: false })
const stateOf = (key: GameKey) => pulse.value?.games.find((g) => g.game === key)
</script>

<template>
  <div class="mx-auto grid w-full max-w-4xl gap-8 py-4 md:py-12">
    <div class="grid gap-1.5 text-center">
      <h1 class="text-3xl font-semibold tracking-tight">Which game are you operating today?</h1>
      <p class="text-[15px] text-muted-foreground">Each game has its own pages and data. You can switch any time from the sidebar.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="game in GAMES" :key="game.key" :to="`/${game.key}`"
        class="group flex flex-col gap-5 rounded-2xl border bg-card p-6 text-card-foreground outline-none transition-colors hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div class="flex items-start gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-muted"><Gamepad2 class="size-5" /></span>
          <div class="min-w-0">
            <h2 class="text-xl font-semibold">{{ game.name }}</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">{{ game.description }}</p>
          </div>
        </div>
        <div v-if="stateOf(game.key)" class="flex items-center gap-2 text-sm">
          <span class="size-2 rounded-full" :class="stateOf(game.key)!.up ? 'bg-emerald-500' : 'bg-muted-foreground'" />
          <span :class="stateOf(game.key)!.up ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'">
            {{ stateOf(game.key)!.up ? `Online${stateOf(game.key)!.detail ? `, ${stateOf(game.key)!.detail}` : ''}` : 'Offline' }}
          </span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <PagePill v-for="feature in visibleFeatures(game, user?.permissions)" :key="feature.to">{{ feature.label }}</PagePill>
        </div>
        <span class="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium">Open {{ game.name }}<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" /></span>
      </NuxtLink>
    </div>
  </div>
</template>
