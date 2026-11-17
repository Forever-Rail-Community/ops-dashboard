<script setup lang="ts">
import { ExternalLink, Eye, EyeOff, LifeBuoy } from '@lucide/vue'

// Sign-in in the middle; behind it, the railroad with what's running on the servers (see the README's "Sign-in page").
definePageMeta({ layout: false })

const route = useRoute()
const { site } = useSite()
const { helpUrl, statusUrl } = useRuntimeConfig().public as { helpUrl: string; statusUrl: string }

const messages: Record<string, string> = {
  'not-member': "Your Discord account isn't in the Forever Rail server. Join the server, then sign in again.",
  'no-role': "Your account doesn't have a role that can use this dashboard. Ask an admin to give you one.",
  discord: "Discord sign-in didn't finish. Try again."
}
const error = computed(() => messages[String(route.query.error ?? '')])

// Four spots around the card for what's happening; each new card takes the next spot. Wide screens only.
const SPOTS = ['top-16 right-[calc(100%+4rem)]', 'top-28 left-[calc(100%+3.5rem)]', 'bottom-10 right-[calc(100%+3rem)]', 'bottom-24 left-[calc(100%+4.5rem)]']
const live = useLiveBackground()
const { pulse, cards, moving } = usePulseFeed(SPOTS.length, live.on)
const spots = computed(() => SPOTS.map((_, i) => cards.value.find((c) => c.key % SPOTS.length === i)))
</script>

<template>
  <div class="relative grid min-h-svh place-items-center overflow-hidden bg-background px-4 py-20 text-foreground">
    <template v-if="live.on.value">
      <div class="pointer-events-none absolute top-1/2 left-1/2 w-[max(1100px,105vw)] -translate-1/2">
        <LoginLiveTrack :trains="pulse?.trains ?? []" :marked="cards.at(-1)?.place" />
      </div>
      <!-- Clears the track behind the sign-in, so the card and headline read cleanly. -->
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_32rem_26rem_at_center,var(--background)_45%,transparent)]" />
    </template>

    <div class="absolute top-4 right-4"><ThemeToggle /></div>

    <main class="relative grid w-full max-w-sm justify-items-center gap-6">
      <h1 class="text-center text-4xl font-semibold tracking-tight sm:text-5xl sm:whitespace-nowrap">Welcome aboard</h1>

      <div class="grid w-full justify-items-center gap-5 rounded-2xl border bg-card p-8 text-center text-card-foreground shadow-lg">
        <div class="flex items-center gap-3">
          <img :src="site.logo" alt="" class="size-12 rounded-xl object-contain" />
          <span class="text-xl font-bold tracking-tight">{{ site.name }}</span>
        </div>
        <div class="grid gap-1.5">
          <h2 class="text-lg font-semibold">Sign in to the Operations Center</h2>
          <p class="text-sm text-muted-foreground">Live maps, server status and updates for Run8 and Railroader.</p>
        </div>
        <Alert v-if="error" variant="destructive" class="text-left"><AlertDescription>{{ error }}</AlertDescription></Alert>
        <!-- Discord's own brand color, as its guidelines ask for a "sign in with Discord" button. -->
        <Button as-child size="lg" class="w-full bg-[#5865F2] text-white hover:bg-[#4752C4]">
          <a href="/auth/discord"><DiscordIcon class="size-5" />Continue with Discord</a>
        </Button>
        <p class="text-xs text-muted-foreground">To sign in, you need the {{ site.memberRole }} role in the {{ site.name }} Discord server.</p>
        <div v-if="helpUrl || statusUrl" class="flex w-full justify-center gap-4 border-t pt-4 text-sm text-muted-foreground">
          <a v-if="helpUrl" :href="helpUrl" class="flex items-center gap-1.5 hover:text-foreground"><LifeBuoy class="size-4" />Help center</a>
          <a v-if="statusUrl" :href="statusUrl" class="flex items-center gap-1.5 hover:text-foreground"><ExternalLink class="size-4" />Server status</a>
        </div>
      </div>

      <p v-if="live.on.value && moving" class="text-sm text-muted-foreground lg:hidden">
        {{ moving }} {{ moving === 1 ? 'train' : 'trains' }} moving on Railroader right now
      </p>

      <template v-if="live.on.value">
        <div v-for="(spot, i) in SPOTS" :key="i" class="drift absolute hidden w-64 lg:block" :class="spot" :style="{ animationDelay: `${-i * 1.7}s` }" aria-live="polite">
          <Transition enter-from-class="opacity-0 motion-safe:scale-95" leave-to-class="opacity-0" enter-active-class="transition duration-500" leave-active-class="transition duration-300" mode="out-in">
            <LoginPulsePill v-if="spots[i]" :key="spots[i]!.key" :card="spots[i]!" />
          </Transition>
        </div>
      </template>
    </main>

    <Button v-if="live.allowed.value" variant="ghost" size="sm" class="absolute bottom-4 left-4 text-muted-foreground" title="Saved in this browser" @click="live.set(!live.on.value)">
      <component :is="live.on.value ? EyeOff : Eye" />
      {{ live.on.value ? 'Turn off live background' : 'Show live background' }}
    </Button>
  </div>
</template>

<style scoped>
/* A slow drift, so the cards feel alive between updates. */
@media (prefers-reduced-motion: no-preference) {
  .drift { animation: drift 7s ease-in-out infinite; }
}
@keyframes drift {
  50% { translate: 0 -6px; }
}
</style>
