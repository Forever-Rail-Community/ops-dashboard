<script setup lang="ts">
import { Check, LoaderCircle } from '@lucide/vue'
import { animate, stagger } from 'motion'

// The welcome on a first sign-in, over the page it lands on, while WELCOME_COOKIE is there (the server sets it to the
// person's role names; see server/utils/members.ts). The logo's outline draws itself in a tile and fills, the tile's
// edge pulses while three steps tick off: their roles appear, then the railroad as it is right now
// (WelcomeRailroad.vue), then the tile flies to the logo at the top of the sidebar as the welcome fades, and the cookie
// is cleared. About five seconds; Skip ends it at once. With reduced motion it shows still for a moment, then fades.
const WELCOME_COLOR = '#00144f'
const STEPS = ['Checking your roles', 'Loading the railroad', 'Opening the Operations Center']

const cookie = useCookie<string[] | null>(WELCOME_COOKIE, { sameSite: 'lax', path: '/' })
const shown = ref(!!cookie.value)
const roles = cookie.value ?? []
const { user } = useUserSession()
const can = (p: string) => user.value?.permissions?.includes(p) ?? false
const railroad = can('map.view') || can('ctc.view')

const step = ref(-1) // the step in progress; past ones are done
const root = ref<HTMLElement>()
const tile = ref<HTMLElement>()
let running: { stop: () => void }[] = []
let over = false
// Animates with Motion, keeping hold of it to stop on finish. Nothing to animate (no trains on the line, say) is fine.
const go = (...args: Parameters<typeof animate>) => {
  if (Array.isArray(args[0]) && !args[0].length) return { stop() {}, finished: Promise.resolve() }
  const a = animate(...args)
  running.push(a)
  return a
}
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const $$ = (selector: string) => [...(root.value?.querySelectorAll<HTMLElement>(selector) ?? [])]

async function play() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    step.value = STEPS.length
    await wait(1800)
    return finish()
  }
  // The tile arrives and the logo's outline draws itself in; the words follow.
  go(tile.value!, { opacity: [0, 1], scale: [0.92, 1] }, { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] })
  go($$('.outline > *'), { strokeDashoffset: [1, 0] }, { duration: 1.2, delay: stagger(0.05, { startDelay: 0.15, from: 'last' }), ease: [0.65, 0, 0.35, 1] })
  go($$('.fade'), { opacity: [0, 1], y: [8, 0] }, { duration: 0.5, delay: stagger(0.08, { startDelay: 0.45 }), ease: 'easeOut' })
  await wait(1350)
  if (over) return
  // It fills in; a light runs round its outline and the tile's edge pulses out while the steps tick off.
  go($$('.fill'), { opacity: [0, 1] }, { duration: 0.45 })
  go($$('.outline'), { opacity: [1, 0] }, { duration: 0.45 })
  go($$('.sweep'), { opacity: [0, 0.9] }, { duration: 0.4 })
  go($$('.sweep > *'), { strokeDashoffset: [0, -1] }, { duration: 1.6, repeat: Infinity, ease: 'linear' })
  $$('.ring').forEach((ring, k) => go(ring, { opacity: [0.55, 0], scale: [1, 1.55] }, { duration: 2, delay: k, repeat: Infinity, ease: [0.2, 0.6, 0.3, 1] }))
  for (let k = 0; k < STEPS.length; k++) {
    step.value = k
    await nextTick()
    if (k === 0) go($$('.badge'), { opacity: [0, 1], scale: [0.6, 1], y: [6, 0] }, { type: 'spring', stiffness: 420, damping: 20, delay: stagger(0.18, { startDelay: 0.15 }) })
    if (k === 1 && railroad) {
      go($$('.railroad-in'), { opacity: [0, 1], y: [10, 0], scale: [0.98, 1] }, { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] })
      go($$('.train .halo'), { scale: [1, 1.8], opacity: [0.9, 0] }, { duration: 1.4, repeat: Infinity, ease: 'easeOut', delay: stagger(0.3) })
      // Moving trains creep the way they're heading while it shows.
      $$('.train').forEach((t) => Number(t.dataset.dir) && go(t, { x: [0, 10 * Number(t.dataset.dir)] }, { duration: 4, ease: 'linear' }))
    }
    await wait(k === STEPS.length - 1 ? 900 : railroad && k === 1 ? 1100 : 750)
    if (over) return
    go($$(`.steps li:nth-child(${k + 1}) .ok`), { scale: [0.4, 1] }, { type: 'spring', stiffness: 500, damping: 18 })
  }
  step.value = STEPS.length
  await wait(450)
  if (!over) finish()
}

// Opens onto the page: the logo tile lifts out and flies to the logo at the top of the sidebar, while the welcome
// fades away behind it. Without the sidebar's logo on screen (a phone, or the sidebar closed), it just fades.
async function finish() {
  if (over) return
  over = true
  cookie.value = null
  const fade = go(root.value!, { opacity: [1, 0] }, { duration: 0.7, delay: 0.15, ease: 'easeInOut' })
  const target = document.querySelector<HTMLElement>('[data-site-logo]')
  const to = target?.getBoundingClientRect()
  const from = tile.value!.getBoundingClientRect()
  if (to?.width && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const flyer = tile.value!.cloneNode(true) as HTMLElement
    flyer.classList.add('flyer')
    Object.assign(flyer.style, {
      position: 'fixed', zIndex: '70', margin: '0', pointerEvents: 'none', background: WELCOME_COLOR,
      left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`
    })
    document.body.append(flyer)
    tile.value!.style.visibility = 'hidden'
    go($$('.stage > :not(.tile)'), { opacity: 0 }, { duration: 0.25 })
    const scale = to.width / from.width
    const flight = go(flyer, {
      x: to.left + to.width / 2 - (from.left + from.width / 2), y: to.top + to.height / 2 - (from.top + from.height / 2),
      scale, borderRadius: `${8 / scale}px`
    }, { type: 'spring', stiffness: 90, damping: 20 })
    // It hands over to the sidebar's own logo as it lands.
    go(flyer, { opacity: [1, 0] }, { duration: 0.3, delay: 0.75 })
    await flight.finished
    flyer.remove()
  }
  await fade.finished
  running.forEach((a) => a.stop())
  running = []
  shown.value = false
}

onMounted(() => shown.value && play())
onBeforeUnmount(() => running.forEach((a) => a.stop()))
</script>

<template>
  <div v-if="shown" ref="root" class="welcome" :style="{ '--welcome': WELCOME_COLOR }" role="status" aria-live="polite">
    <div class="stage">
      <div ref="tile" class="tile" aria-hidden="true">
        <span class="ring" /><span class="ring" />
        <div class="logo">
          <FrLogo class="fill" />
          <FrLogo class="outline" />
          <FrLogo class="sweep" />
        </div>
      </div>
      <h1 class="fade">
        <UserAvatar class="size-[30px] ring-2 ring-white/20" />
        Welcome aboard, {{ user?.name }}
      </h1>
      <p class="lede fade">Getting the Operations Center ready for you.</p>
      <div v-if="roles.length" class="roles" aria-label="Your roles">
        <span v-for="r in roles" :key="r" class="badge">{{ r }}</span>
      </div>
      <div v-if="railroad" class="railroad-in"><WelcomeRailroad :line="can('ctc.view')" /></div>
      <ul class="steps fade">
        <li v-for="(s, k) in STEPS" :key="s" :class="k === step ? 'now' : k < step ? 'done' : ''">
          <span class="icon"><LoaderCircle v-if="k === step" class="spin" /><Check v-else-if="k < step" class="ok" /><i v-else /></span>{{ s }}
        </li>
      </ul>
    </div>
    <button type="button" class="skip fade" @click="finish">Skip</button>
  </div>
</template>

<style scoped>
.welcome {
  position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; overflow: hidden; color: #fff;
  background-color: var(--welcome);
  background-image:
    radial-gradient(ellipse 60% 45% at 50% 30%, color-mix(in oklab, var(--welcome), white 14%), transparent 70%),
    radial-gradient(circle, rgb(255 255 255 / 0.07) 1px, transparent 1.5px);
  background-size: 100% 100%, 22px 22px;
}
.welcome::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 75% 70% at 50% 45%, transparent 40%, color-mix(in oklab, var(--welcome), black 45%)); }
.stage { position: relative; z-index: 1; display: grid; justify-items: center; width: min(360px, calc(100vw - 48px)); }

.tile {
  position: relative; width: 104px; height: 104px; border-radius: 26px; display: grid; place-items: center;
  background: rgb(255 255 255 / 0.06); border: 1px solid rgb(255 255 255 / 0.14);
  box-shadow: 0 20px 50px -12px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.08);
}
:global(.flyer .ring), :global(.flyer .outline), :global(.flyer .sweep) { display: none; }
.ring { position: absolute; inset: -1px; border-radius: 26px; border: 1.5px solid rgb(255 255 255 / 0.5); opacity: 0; }
.logo { position: relative; width: 62px; aspect-ratio: 758.16 / 595.92; }
.logo :deep(svg), :global(.flyer svg) { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.logo :deep(.fill > *), :global(.flyer .fill > *) { fill: #fff; }
.logo :deep(.outline > *), .logo :deep(.sweep > *) { fill: none; stroke-linejoin: round; stroke-linecap: round; }
.logo :deep(.outline > *) { stroke: rgb(255 255 255 / 0.9); stroke-width: 9; stroke-dasharray: 1; stroke-dashoffset: 1; }
.logo :deep(.sweep > *) { stroke: #fff; stroke-width: 12; stroke-dasharray: 0.12 0.88; filter: drop-shadow(0 0 10px #fff); }
.logo :deep(.sweep), .logo :deep(.fill) { opacity: 0; }

h1 { margin-top: 28px; display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 600; letter-spacing: -0.015em; }
.lede { margin-top: 6px; font-size: 14px; color: rgb(255 255 255 / 0.62); }
.roles { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 24px; margin-top: 14px; }
.badge {
  display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 6px; font-size: 12px; font-weight: 500;
  border: 1px solid rgb(255 255 255 / 0.16); background: rgb(255 255 255 / 0.07); color: rgb(255 255 255 / 0.88); opacity: 0;
}
.railroad-in { width: 100%; margin-top: 18px; opacity: 0; }
.steps { width: 100%; margin-top: 18px; padding: 6px; border-radius: 14px; background: rgb(255 255 255 / 0.045); border: 1px solid rgb(255 255 255 / 0.09); }
.steps li { display: flex; align-items: center; gap: 10px; height: 38px; padding: 0 10px; border-radius: 9px; font-size: 14px; color: rgb(255 255 255 / 0.4); }
.steps li.now { color: #fff; background: rgb(255 255 255 / 0.06); }
.steps li.done { color: rgb(255 255 255 / 0.78); }
.icon { display: grid; place-items: center; width: 16px; height: 16px; flex: none; }
.icon svg { width: 16px; height: 16px; }
.icon .ok { color: #4ade80; }
.icon i { width: 6px; height: 6px; border-radius: 50%; background: rgb(255 255 255 / 0.25); }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.fade { opacity: 0; }
.skip {
  position: absolute; z-index: 1; bottom: 22px; left: 50%; translate: -50% 0; height: 32px; padding: 0 14px; border-radius: 8px;
  border: 1px solid rgb(255 255 255 / 0.14); background: rgb(255 255 255 / 0.04); color: rgb(255 255 255 / 0.72); font-size: 13px;
}
.skip:hover { color: #fff; background: rgb(255 255 255 / 0.08); }

/* Reduced motion: everything shows at once, still. */
@media (prefers-reduced-motion: reduce) {
  .fade, .badge, .railroad-in, .logo :deep(.fill) { opacity: 1; }
  .logo :deep(.outline) { display: none; }
  .spin { animation: none; }
}
</style>
