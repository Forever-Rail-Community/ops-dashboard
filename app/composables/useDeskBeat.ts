import { useEventListener, useIntervalFn } from '@vueuse/core'
import { toast } from 'vue-sonner'

// Checks a dispatcher on a desk in with the server (server/utils/ctcDesks.ts): still here, and how long since they
// last clicked, typed or scrolled on the site. Without a check-in for DESK_AWAY_SEC they're taken off their desk, and
// a line can also take them off after a while with no activity (Edit desks).
//
// Run by the app itself, so any open Operations Center page counts, whatever it shows: a dispatcher can look at the
// map or have the game in front of the browser. It keeps going in a background tab (browsers slow timers there to
// about once a minute, still inside DESK_AWAY_SEC). It stops when the server says they're on no desk, and starts again
// when they take one.
export function useDeskBeat() {
  const { user } = useUserSession()
  const desks = useState<CtcDesksData | null>('ctc-desks', () => null)
  const onDesk = ref(false)
  const can = computed(() => user.value?.permissions?.includes('ctc.control') ?? false)

  let lastActive = Date.now()
  for (const kind of ['pointerdown', 'pointermove', 'keydown', 'wheel'] as const) {
    useEventListener(kind, () => (lastActive = Date.now()), { passive: true })
  }

  async function checkIn() {
    if (!can.value) return
    try {
      const idleSec = Math.round((Date.now() - lastActive) / 1000)
      const answer = await $fetch<{ onDesk: boolean; takenOff?: string }>('/api/railroader/ctc/desks/beat', { method: 'POST', body: { idleSec } })
      onDesk.value = answer.onDesk
      if (answer.takenOff) toast.info('Clocked out automatically', { description: answer.takenOff, duration: Infinity })
    } catch {
      // The next one tries again.
    }
  }
  const { pause, resume } = useIntervalFn(checkIn, DESK_BEAT_SEC * 1000, { immediate: false })
  watch(onDesk, (on) => (on ? resume() : pause()))
  // Taking a desk on this visit starts it straight away.
  watch(() => desks.value?.desks.some((d) => d.holder?.userId === user.value?.id), (on) => { if (on && !onDesk.value) checkIn() })
  onMounted(checkIn)
}
