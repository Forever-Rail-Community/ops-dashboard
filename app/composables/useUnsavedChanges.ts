// Whether a form differs from what was last saved, for the save bar (AdminSaveBar). `discard` puts it back.
export function useUnsavedChanges<T extends object>(state: T) {
  const saved = ref(JSON.stringify(state))
  const dirty = computed(() => JSON.stringify(state) !== saved.value)
  const markSaved = () => (saved.value = JSON.stringify(state))
  const discard = () => Object.assign(state, JSON.parse(saved.value))
  return { dirty, markSaved, discard }
}
