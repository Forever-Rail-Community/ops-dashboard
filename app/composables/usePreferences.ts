// The signed-in person's own choices, loaded once and shared by every component. Changing one saves it to their
// account right away; until the first load finishes (`ready`), the defaults apply.
export function usePreferences() {
  const prefs = useState<Preferences>('preferences', () => ({ units: DEFAULT_UNITS, whatsNewAuto: true, whatsNewSeen: 0, railroadTheme: DEFAULT_RAILROAD_THEME }))
  const requested = useState('preferences-requested', () => false)
  const ready = useState('preferences-ready', () => false)
  const { loggedIn } = useUserSession()

  if (import.meta.client && !requested.value && loggedIn.value) {
    requested.value = true
    $fetch<Preferences>('/api/me/preferences')
      .then((saved) => {
        prefs.value = saved
        ready.value = true
      })
      .catch(() => (requested.value = false))
  }

  async function update(changes: Partial<Preferences>) {
    const before = prefs.value
    prefs.value = { ...before, ...changes } // show it at once; put it back if saving fails
    try {
      prefs.value = await $fetch<Preferences>('/api/me/preferences', { method: 'PUT', body: changes })
    } catch (error) {
      prefs.value = before
      throw error
    }
  }
  return { prefs: readonly(prefs), ready: readonly(ready), update }
}

// The person's units, with formatters bound to them.
export function useUnits() {
  const { prefs } = usePreferences()
  const units = computed(() => prefs.value.units)
  return {
    units,
    distance: (meters: number) => formatDistance(meters, units.value),
    height: (meters: number) => formatHeight(meters, units.value),
    speed: (mph: number) => formatSpeed(mph, units.value)
  }
}
