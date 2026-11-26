// The CTC board's saved lines, for the board, Desks and Edit desks. Kept for the whole visit, so moving between them
// shows the lines at once while a fresh copy loads.
export function useCtcLines() {
  const lines = useState<CtcLine[] | null>('ctc-lines', () => null)
  const { data, error } = useFetch<CtcLine[]>('/api/railroader/ctc/lines', { server: false, lazy: true })
  watch(data, (fresh) => { if (fresh) lines.value = fresh }, { immediate: true })
  return { lines, error }
}
