// What's new for the signed-in person: the published updates, whether the dialog is open, and whether there's an
// update they haven't seen. "Seen" and "open by itself" are saved with their account (see usePreferences).
export function useWhatsNew() {
  const open = useState('whats-new-open', () => false)
  const updates = useState<Update[] | null>('whats-new-updates', () => null)
  const { prefs, ready, update } = usePreferences()

  const latestId = computed(() => updates.value?.[0]?.id ?? 0)
  const unseen = computed(() => latestId.value > prefs.value.whatsNewSeen)

  async function load() {
    if (!updates.value) updates.value = await $fetch<Update[]>('/api/updates').catch(() => [])
  }
  async function close() {
    open.value = false
    if (unseen.value) await update({ whatsNewSeen: latestId.value }).catch(() => {})
  }
  const setAutoShow = (on: boolean) => update({ whatsNewAuto: on }).catch(() => {})

  return { open, updates, ready, unseen, autoShow: computed(() => prefs.value.whatsNewAuto), load, close, setAutoShow }
}
