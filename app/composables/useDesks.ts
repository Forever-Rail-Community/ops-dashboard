import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import { toast } from 'vue-sonner'

// The CTC desks (shared/types/ctcDesks.ts) for the board and the Desks pages: re-read every DESK_BEAT_SEC while the
// page is visible. Taking, leaving and editing go through here, so each page shows the result straight away. (Saying
// a dispatcher is still here is the app's job: useDeskBeat.)
export function useDesks() {
  // Kept for the whole visit, like the lines, so pages show the desks at once while a fresh copy loads.
  const data = useState<CtcDesksData | null>('ctc-desks', () => null)
  const { data: fresh, error, refresh } = useFetch<CtcDesksData>('/api/railroader/ctc/desks', { server: false, lazy: true })
  watch(fresh, (value) => { if (value) data.value = value }, { immediate: true })
  const busy = ref(false)

  const { pause, resume } = useIntervalFn(refresh, DESK_BEAT_SEC * 1000)
  const visibility = useDocumentVisibility()
  watch(visibility, (state) => (state === 'visible' ? (refresh(), resume()) : pause()))

  async function act(method: 'POST' | 'PUT', url: string, words: { done: string; failed: string }, body?: object) {
    busy.value = true
    try {
      // The fetch's own copy too: another page's useFetch starts from it, and an older one would undo the change.
      data.value = fresh.value = await $fetch<CtcDesksData>(url, { method, body })
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
  const save = (lineId: string, desks: { id?: string; name: string; start: string }[], settings: CtcDeskSettings) =>
    act('PUT', `/api/railroader/ctc/lines/${lineId}/desks`, { done: 'Desks saved', failed: 'Desks not saved' }, { desks, settings })

  return { data, error, busy, take, leave, save }
}
