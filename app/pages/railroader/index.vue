<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core'
import { Activity, Copy, Check, KeyRound, Sparkles, TrainFront } from '@lucide/vue'

// The Overview: what a member needs before joining. Is the railroad running, how to get in, what's running on it,
// and what's new in the Operations Center. Staff details are on Game status.
const { user } = useUserSession()
const { site } = useSite()
const { speed } = useUnits()
const { appVersion, appCommit } = useRuntimeConfig().public
const { copied, copyText } = useCopyText()
const whatsNew = useWhatsNew()

const { data, error, refresh } = useFetch<RailroaderOverview>('/api/railroader/overview', { key: 'railroader-overview' })
useIntervalFn(refresh, 15_000)
onMounted(() => whatsNew.load())

const railroad = computed(() => data.value?.railroad ?? null)
const online = computed(() => railroad.value?.online ?? false)
const trains = computed(() => data.value?.trains ?? [])
const moving = computed(() => trains.value.filter(isMoving).length)
const updates = computed(() => (whatsNew.updates.value ?? []).slice(0, 10))

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return `Good ${part}${user.value?.name ? `, ${user.value.name}` : ''}`
})
const statusDetail = computed(() => {
  if (!railroad.value) return 'No server is reporting right now'
  if (!online.value) return 'The railroad isn’t running right now'
  return railroad.value.upSec != null ? `Up ${formatDuration(railroad.value.upSec)}` : 'Running'
})
const dateOf = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '')
const changesOf = (u: Update) => `${u.changes.length} ${u.changes.length === 1 ? 'change' : 'changes'}`
</script>

<template>
  <div class="relative -mx-4 flex flex-col md:-mx-6">
    <div aria-hidden="true" class="overview-band absolute inset-x-0 top-0 h-72" />
    <div class="relative mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pt-2 pb-4 md:px-8">
      <header>
        <div class="text-xl leading-tight font-semibold">{{ greeting }}</div>
        <div class="mt-0.5 text-base text-muted-foreground">
          Here’s {{ railroad?.name ?? 'the railroad' }} today.
        </div>
      </header>
      <h1 class="text-3xl font-semibold tracking-tight">Overview</h1>

      <p v-if="error" class="text-sm text-destructive">The Overview couldn’t load. It tries again every 15 seconds.</p>

      <div class="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <OverviewStatCard :icon="Activity" label="Railroad status">
          <span class="text-[26px] font-semibold">{{ online ? 'Online' : 'Offline' }}</span>
          <template #detail>
            <span :class="online ? 'text-emerald-600 dark:text-emerald-300' : ''">{{ statusDetail }}</span>
          </template>
        </OverviewStatCard>

        <OverviewStatCard :icon="KeyRound" label="Join code">
          <template v-if="railroad?.joinCode">
            <span class="font-mono text-[26px] font-semibold tracking-[.14em] select-all">{{ railroad.joinCode }}</span>
            <Button variant="outline" size="sm" class="ml-auto" :aria-label="copied ? 'Copied' : 'Copy join code'" @click="copyText(railroad.joinCode)">
              <Check v-if="copied" /><Copy v-else />{{ copied ? 'Copied' : 'Copy' }}
            </Button>
          </template>
          <span v-else class="text-[26px] font-semibold text-muted-foreground">{{ online && railroad?.joinCode === null ? 'Not open' : 'None yet' }}</span>
          <template #detail>
            <div>{{ railroad?.joinCode ? 'Enter it in Join Multiplayer' : 'Shows here when the railroad opens' }}</div>
            <div v-if="railroad?.gameVersion" class="mt-1">
              Needs Railroader
              <span class="rounded-full bg-emerald-500/15 px-1.5 font-semibold text-emerald-700 dark:text-emerald-300">{{ railroad.gameVersion }}</span>
            </div>
          </template>
        </OverviewStatCard>

        <OverviewStatCard :icon="TrainFront" label="Trains running">
          <span class="text-[26px] font-semibold tabular-nums">{{ trains.length }}</span>
          <template #detail>{{ trains.length ? `${moving} moving, ${trains.length - moving} stopped` : 'None out right now' }}</template>
        </OverviewStatCard>
      </div>

      <div class="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]">
        <OverviewSection :icon="TrainFront" title="Running now" :count="trains.length" :row-height="60" :description="online ? 'Trains out on the railroad, and where they are.' : 'Trains show here while the railroad is running.'">
          <template #action><NuxtLink to="/railroader/map" class="underline-offset-4 hover:underline">Open the map</NuxtLink></template>
          <div v-for="t in trains" :key="t.id" class="flex h-[60px] items-center gap-3 border-t">
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-violet-700 dark:text-violet-300">{{ t.name }}</div>
              <div class="truncate text-[13px] text-muted-foreground">Near {{ t.near }}</div>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
              :class="isMoving(t) ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'"
            >{{ isMoving(t) ? speed(t.speedMph) : 'Stopped' }}</span>
          </div>
          <template #empty>No trains running.</template>
        </OverviewSection>

        <OverviewSection :icon="Sparkles" title="What’s new" :count="updates.length" :row-height="58" description="The latest releases and fixes to the Operations Center.">
          <template #action><button type="button" class="underline-offset-4 hover:underline" @click="whatsNew.open.value = true">All updates</button></template>
          <button
            v-for="u in updates" :key="u.id" type="button"
            class="flex h-[58px] w-full items-center gap-3 border-t text-left"
            @click="whatsNew.open.value = true"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold">{{ u.title }}</span>
              <span class="block text-xs text-muted-foreground">{{ dateOf(u.publishedAt) }}</span>
            </span>
            <span class="rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">{{ changesOf(u) }}</span>
          </button>
          <template #empty>Nothing new yet.</template>
        </OverviewSection>
      </div>

      <footer class="flex flex-wrap gap-x-5 gap-y-2 pt-2 text-[13px] text-muted-foreground">
        <span>{{ site.name }}</span>
        <span class="ml-auto" :title="appCommit ? `Build ${appCommit}` : undefined">
          Operations Center <span class="font-medium text-foreground tabular-nums">v{{ appVersion }}</span>
        </span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Our own track drawing behind the top of the page. The image is light lines on gray: shown darkened in dark mode
   and inverted (dark lines on light) in light mode. It fades in and out so it has no edges, and stays faint enough
   that text over it is easy to read. */
.overview-band {
  background: url('/overview-band.webp') center / cover;
  mask-image: linear-gradient(180deg, transparent, #000 25%, #000 55%, transparent);
  filter: invert(1);
  opacity: 0.35;
}
.dark .overview-band {
  background:
    linear-gradient(color-mix(in oklch, var(--background) 45%, transparent), color-mix(in oklch, var(--background) 45%, transparent)),
    url('/overview-band.webp') center / cover;
  filter: none;
  opacity: 1;
}
</style>
