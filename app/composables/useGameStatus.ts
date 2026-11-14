import { useIntervalFn } from '@vueuse/core'

// One game's server status, refreshed every 15 seconds. Each game asks its own endpoint.
export function useGameStatus<Agent extends AgentBase>(game: GameKey) {
  const { data, error, refresh } = useFetch<GameStatus<Agent>>(`/api/status/${game}`, { key: `status-${game}` })
  useIntervalFn(refresh, 15_000)

  return {
    loaded: computed(() => data.value != null),
    agents: computed(() => data.value?.agents ?? []),
    detailed: computed(() => data.value?.detailed ?? false),
    error,
    forbidden: computed(() => error.value?.statusCode === 403)
  }
}
