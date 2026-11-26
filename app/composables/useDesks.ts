import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { toast } from 'vue-sonner'

// The CTC desks (shared/types/ctcDesks.ts) for the board and the Desks page: re-read every DESK_BEAT_SEC while the
// page is visible, which is also when a dispatcher on a desk says they're still there. Taking, leaving and editing go
// through here, so each page shows the result straight away.
export function useDesks() {
  const { user } = useUserSession()
  const { data, error, refresh } = useFetch<CtcDesksData>('/api/railroader/ctc/desks', { server: false, lazy: true, key: 'ctc-desks' })
  const busy = ref(false)
  const onDesk = computed(() => data.value?.desks.some((d) => d.holder?.userId === user.value?.id) ?? false)

  async function tick() {
    if (onDesk.value) await $fetch('/api/railroader/ctc/desks/beat', { method: 'POST' }).catch(() => {})
    await refresh()
  }
  const { pause, resume } = useIntervalFn(tick, DESK_BEAT_SEC * 1000)
  const visibility = useDocumentVisibility()
  watch(visibility, (state) => (state === 'visible' ? (tick(), resume()) : pause()))
  // A desk just taken counts as there at once.
  watch(onDesk, (now, before) => { if (now && !before) tick() })

  async function act(method: 'POST' | 'PUT', url: string, words: { done: string; failed: string }, body?: object) {
    busy.value = true
    try {
      data.value = await $fetch<CtcDesksData>(url, { method, body })
      toast.success(words.done)
      return true
    } catch (err: any) {
      toast.error(words.failed, { description: err?.data?.statusMessage ?? 'Try again.' })
      await refresh()
      return false
    } finally {
      busy.value = false
    }
  }
  const take = (id: string) =>
    act('POST', `/api/railroader/ctc/desks/${id}/take`, { done: 'You took the desk', failed: "Couldn't take the desk" })
  const leave = (id: string, note: { items: string[]; text: string }) =>
    act('POST', `/api/railroader/ctc/desks/${id}/leave`, { done: 'You left the desk', failed: "Couldn't leave the desk" }, note)
  const save = (lineId: string, desks: { id?: string; name: string; start: string }[]) =>
    act('PUT', `/api/railroader/ctc/lines/${lineId}/desks`, { done: 'Desks saved', failed: 'Desks not saved' }, { desks })

  return { data, error, busy, take, leave, save }
}
