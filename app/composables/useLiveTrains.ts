import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

// Live train positions for the Railroader map, refreshed every 5 seconds while the page is visible.
const REFRESH_MS = 5_000

export function useLiveTrains() {
  const { data, error, refresh } = useFetch<TrainsResponse>('/api/railroader/trains', { server: false, lazy: true, key: 'live-trains' })

  const { pause, resume } = useIntervalFn(refresh, REFRESH_MS)
  const visibility = useDocumentVisibility()
  watch(visibility, (state) => {
    if (state === 'visible') {
      refresh()
      resume()
    } else {
      pause()
    }
  })

  const live = computed<LiveMapData>(() => ({ trains: data.value?.trains ?? [], stale: data.value?.stale ?? false }))
  return { live, response: data, error }
}
