import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import type { Ref } from 'vue'

// What moves on the Railroader map (trains and switch positions), refreshed every 5 seconds while the
// page is visible. Trains are placed on the track as the map draws it.
const REFRESH_MS = 5_000

export function useLiveMap(map: Ref<MapData | null | undefined>) {
  const { data, error, refresh } = useFetch<LiveResponse>('/api/railroader/live', { server: false, lazy: true, key: 'live-map' })

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

  const live = computed<LiveMapData>(() => {
    const trains = data.value?.trains ?? []
    return {
      trains: map.value ? trains.map((t) => placeOnTrack(map.value!, t)) : trains,
      stale: data.value?.trainsAge.stale ?? false,
      switches: data.value?.switches ?? {},
      switchesStale: data.value?.switchesAge.stale ?? false,
      industries: data.value?.industries ?? { cars: {}, passengers: {} },
      industriesStale: data.value?.industriesAge?.stale ?? false,
      industriesReported: (data.value?.industriesAge?.ageSec ?? null) !== null
    }
  })
  return { live, response: data, error }
}
