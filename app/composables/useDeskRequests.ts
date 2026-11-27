import { useIntervalFn } from '@vueuse/core'
import { toast } from 'vue-sonner'

// Transfer requests and staff takeovers (FOR-17, server/utils/ctcDeskRequests.ts) for the whole site. With `poll` (only
// CtcDeskRequests, mounted once in app.vue, so there's one check however many pages use this), checks every
// DESK_REQUEST_POLL_SEC while the dispatcher is on a desk, is waiting on a request of their own, or has the Desks page
// open (every DESK_BEAT_SEC otherwise), and shows each notice the server leaves them as a toast. Asking, withdrawing
// and answering go through here, so every page sees the result at once.
export function useDeskRequests({ poll = false } = {}) {
  const { user } = useUserSession()
  const data = useState<CtcDeskRequestsData | null>('ctc-desk-requests', () => null)
  const watchers = useState('ctc-desk-requests-watchers', () => 0) // open Desks pages, which show every request
  const desks = useState<CtcDesksData | null>('ctc-desks', () => null)
  const busy = ref(false)
  const can = computed(() => user.value?.permissions?.includes('ctc.control') ?? false)
  const me = computed(() => user.value?.id ?? '')

  const waiting = computed(() => data.value?.requests.some((r) => r.from.userId === me.value) ?? false)
  const onDesk = computed(() => (data.value?.onDesk ?? false) || (desks.value?.desks.some((d) => d.holder?.userId === me.value) ?? false))
  const active = computed(() => can.value && (onDesk.value || waiting.value || watchers.value > 0))
  // The first request for one of your desks: the one the pop-up shows.
  const incoming = computed(() => data.value?.requests.find((r) => r.to.userId === me.value) ?? null)

  function take(answer: CtcDeskRequestsData) {
    data.value = answer
    for (const n of answer.notices) (n.success ? toast.success : toast.info)(n.title, { description: n.description, duration: 15_000 })
    if (answer.notices.length) refreshNuxtData(DESKS_FETCH_KEY) // a desk changed hands
  }
  async function check() {
    if (!can.value) return
    try {
      take(await $fetch<CtcDeskRequestsData>('/api/railroader/ctc/desks/requests'))
    } catch {
      // The next check tries again.
    }
  }
  if (poll) {
    // Off duty, a slow check still notices a clock-in from another tab or device.
    const every = computed(() => (active.value ? DESK_REQUEST_POLL_SEC : DESK_BEAT_SEC) * 1000)
    useIntervalFn(check, every)
    watch(active, (on) => { if (on) check() })
    onMounted(check)
  }

  async function act(method: 'POST' | 'DELETE', url: string, failed: string, body?: object) {
    busy.value = true
    try {
      take(await $fetch<CtcDeskRequestsData>(url, { method, body }))
      return true
    } catch (err: any) {
      toast.error(failed, { description: err?.data?.statusMessage ?? 'Please try again.' })
      await check()
      return false
    } finally {
      busy.value = false
    }
  }
  const desk = (id: string) => `/api/railroader/ctc/desks/${id}`
  const ask = (id: string, takeover: boolean) =>
    act('POST', `${desk(id)}/request`, takeover ? 'Takeover could not be started' : 'Transfer could not be requested', { takeover })
  const withdraw = (id: string) => act('DELETE', `${desk(id)}/request`, 'Request could not be withdrawn')
  const answer = (id: string, approve: boolean) => act('POST', `${desk(id)}/answer`, approve ? 'Transfer could not be completed' : 'Request could not be declined', { approve })
  const seen = (id: string) => $fetch(`${desk(id)}/seen`, { method: 'POST' }).catch(() => {})

  // Keeps checking while a Desks page is open, so it shows other dispatchers' requests too.
  function watchAll() {
    onMounted(() => watchers.value++)
    onUnmounted(() => watchers.value--)
  }

  return { data, incoming, busy, ask, withdraw, answer, seen, watchAll }
}
