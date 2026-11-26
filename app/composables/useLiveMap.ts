import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'
import type { Ref } from 'vue'

// What moves on the Railroader map (trains, switch positions, cars at industries, signals), refreshed every
// 5 seconds while the page is visible. Trains are placed on the track as the map draws it. The signal layout is
// fetched only when its version changes, and kept between pages.
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

  // Kept for the whole visit, so moving between the map, the CTC board and the Desks page shows it at once instead of
  // waiting for the next refresh.
  const signalLayout = useState<RailroaderSignalLayout | null>('signal-layout', () => null)
  const layoutVersion = useState<number | null>('signal-layout-version', () => null)
  watch(
    () => data.value?.signalLayoutVersion,
    async (version) => {
      if (!version || version === layoutVersion.value) return
      try {
        signalLayout.value = await $fetch<RailroaderSignalLayout>(`/api/railroader/signal-layout?v=${version}`)
        layoutVersion.value = version
      } catch {
        // Keep the last layout; the next refresh tries again.
      }
    },
    { immediate: true }
  )

  const live = computed<LiveMapData>(() => {
    const trains = data.value?.trains ?? []
    return {
      trains: map.value ? trains.map((t) => placeOnTrack(map.value!, t)) : trains,
      stale: data.value?.trainsAge.stale ?? false,
      switches: data.value?.switches ?? {},
      switchesStale: data.value?.switchesAge.stale ?? false,
      switchLegs: signalLayout.value?.switchLegs ?? {},
      industries: data.value?.industries ?? { cars: {}, passengers: {} },
      industriesStale: data.value?.industriesAge?.stale ?? false,
      industriesReported: (data.value?.industriesAge?.ageSec ?? null) !== null,
      signals: {
        layout: signalLayout.value,
        aspects: data.value?.signals?.aspects ?? {},
        occupied: data.value?.signals?.occupied ?? {},
        stale: data.value?.signalsAge?.stale ?? false
      }
    }
  })
  return { live, response: data, error }
}
