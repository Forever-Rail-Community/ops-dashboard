// Whether this visitor wants the sign-in page's live background. Kept in this browser only: nobody is signed in yet.
// Admins can also turn it off for everyone (site.loginLive); that wins.
const STORAGE_KEY = 'fr-login-live'

export function useLiveBackground() {
  const { site } = useSite()
  const wanted = useState('login-live-wanted', () => true)
  onMounted(() => {
    try { wanted.value = localStorage.getItem(STORAGE_KEY) !== 'off' } catch { /* storage blocked: stays on */ }
  })
  function set(next: boolean) {
    wanted.value = next
    try { localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off') } catch { /* storage blocked: lasts until reload */ }
  }
  return {
    allowed: computed(() => site.value.loginLive),
    on: computed(() => site.value.loginLive && wanted.value),
    set
  }
}
