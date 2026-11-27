import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

// Refreshing the open ticket and the list while the page is visible, so replies from the other side show up without
// a reload. Discord replies will arrive the same way later.
const REFRESH_MS = 20_000

// A list of tickets with one open beside it (?ticket=<id>): My tickets ("mine") and the staff inbox ("all").
export function useTickets(scope: 'mine' | 'all') {
  const route = useRoute()
  const router = useRouter()

  const list = useFetch<TicketSummary[]>('/api/tickets', {
    key: `tickets-${scope}`,
    query: scope === 'all' ? { all: '1' } : undefined,
    default: () => []
  })

  const selectedId = computed<number | null>({
    get: () => Number(route.query.ticket) || list.data.value[0]?.id || null,
    set: (id) => router.replace({ query: { ...route.query, ticket: id ? String(id) : undefined } })
  })

  const ticket = ref<Ticket | null>(null)
  const loading = ref(false)

  async function load(id: number | null) {
    if (!id) {
      ticket.value = null
      return
    }
    loading.value = !ticket.value || ticket.value.id !== id
    try {
      ticket.value = await $fetch<Ticket>(`/api/tickets/${id}`)
    } catch {
      ticket.value = null
    } finally {
      loading.value = false
    }
  }
  watch(selectedId, load, { immediate: true })

  // After a change on the server: show the ticket it returned and bring the list up to date.
  async function replace(updated: Ticket) {
    ticket.value = updated
    await list.refresh()
  }

  const refreshAll = () => Promise.all([list.refresh(), load(selectedId.value)])
  const visible = useDocumentVisibility()
  const { pause, resume } = useIntervalFn(refreshAll, REFRESH_MS, { immediate: false })
  watch(
    visible,
    (now, before) => {
      if (now !== 'visible') return pause()
      if (before === 'hidden') refreshAll() // coming back to the tab: catch up at once
      resume()
    },
    { immediate: true }
  )

  return { list, selectedId, ticket, loading, replace, refreshAll }
}

