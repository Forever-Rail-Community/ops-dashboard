// A live train's recorded path (the game server keeps the last 30 minutes), refreshed every 30 seconds while shown.
// New samples are taken about every 20 seconds, so refreshing faster wouldn't show more.
export function useTrainHistory(train: Ref<LiveTrain | undefined>) {
  const query = computed(() => (train.value ? { agent: train.value.agentId, train: train.value.id } : undefined))
  const { data, refresh } = useFetch<TrainHistory>('/api/railroader/train-history', {
    query,
    server: false,
    lazy: true,
    immediate: Boolean(query.value),
    watch: [query]
  })
  const timer = setInterval(() => query.value && refresh(), 30_000)
  onBeforeUnmount(() => clearInterval(timer))
  return computed(() => data.value?.samples ?? [])
}
