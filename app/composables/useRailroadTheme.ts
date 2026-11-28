const STORAGE_KEY = 'railroad-theme'

// The person's railroad theme (saved with their account, see usePreferences), shown as data-railroad on <html>.
// It's also kept in this browser so the next page load can show it before the account's preferences arrive.
export function useRailroadTheme() {
  const { prefs, ready, update } = usePreferences()
  const key = computed(() => prefs.value.railroadTheme)
  const theme = computed(() => railroadTheme(key.value))

  function apply(next: RailroadThemeKey) {
    if (next === DEFAULT_RAILROAD_THEME) delete document.documentElement.dataset.railroad
    else document.documentElement.dataset.railroad = next
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage blocked: the account still has it */ }
  }

  // Call once (app.vue does): follows the saved choice once it has loaded.
  function init() {
    onMounted(() => watch([ready, key], ([loaded, next]) => loaded && apply(next), { immediate: true }))
  }

  const set = (next: RailroadThemeKey) => update({ railroadTheme: next })

  // The last theme shown in this browser, set before the page paints so it doesn't flash the default.
  const bootScript =
    `try{var r=localStorage.getItem('${STORAGE_KEY}');` +
    `if(r&&r!=='${DEFAULT_RAILROAD_THEME}')document.documentElement.dataset.railroad=r}catch(e){}`

  return { key, theme, set, init, bootScript }
}
