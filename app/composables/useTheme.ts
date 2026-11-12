export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark' || v === 'system'

// Light/dark choice, remembered in this browser. "system" follows the device setting.
export function useTheme() {
  const theme = useState<Theme>('theme', () => 'system')
  const isDark = useState('theme-dark', () => false) // what "system" resolved to; things drawn on a canvas follow this

  function apply() {
    const dark = theme.value === 'dark' || (theme.value === 'system' && matchMedia(DARK_QUERY).matches)
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }

  function set(next: Theme) {
    theme.value = next
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* storage blocked: the choice lasts until reload */ }
    apply()
  }

  // Call once (the toggle does): loads the saved choice and follows device changes while on "system".
  function init() {
    onMounted(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (isTheme(saved)) theme.value = saved
      } catch { /* storage blocked */ }
      apply()
      const query = matchMedia(DARK_QUERY)
      query.addEventListener('change', apply)
      onBeforeUnmount(() => query.removeEventListener('change', apply))
    })
  }

  // Same rule as apply(), as plain text for <head> so it can run before the page paints.
  const bootScript =
    `try{var t=localStorage.getItem('${STORAGE_KEY}');` +
    `document.documentElement.classList.toggle('dark',t==='dark'||(t!=='light'&&matchMedia('${DARK_QUERY}').matches))}catch(e){}`

  return { theme, isDark, set, init, bootScript }
}
