import { useIntervalFn } from '@vueuse/core'

// Says a dispatcher on a desk is still here (server/utils/ctcDesks.ts takes them off after DESK_AWAY_SEC without).
// Run by the app itself, so any open Operations Center page counts, whatever it shows: a dispatcher can look at the map
// or have the game in front of the browser. It keeps going in a background tab (browsers slow timers there to about
// once a minute, still inside DESK_AWAY_SEC). It stops when the server says they're on no desk, and starts again when
// they take one.
export function useDeskBeat() {
  const { user } = useUserSession()
  const desks = useState<CtcDesksData | null>('ctc-desks', () => null)
  const onDesk = ref(false)
  const can = computed(() => user.value?.permissions?.includes('ctc.control') ?? false)

  async function beat() {
    if (!can.value) return
    try {
      onDesk.value = (await $fetch<{ onDesk: boolean }>('/api/railroader/ctc/desks/beat', { method: 'POST' })).onDesk
    } catch {
      // The next one tries again.
    }
  }
  const { pause, resume } = useIntervalFn(beat, DESK_BEAT_SEC * 1000, { immediate: false })
  watch(onDesk, (on) => (on ? resume() : pause()))
  // Taking a desk on this visit starts it straight away.
  watch(() => desks.value?.desks.some((d) => d.holder?.userId === user.value?.id), (on) => { if (on && !onDesk.value) beat() })
  onMounted(beat)
}
