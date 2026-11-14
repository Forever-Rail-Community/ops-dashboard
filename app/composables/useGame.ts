// Which game someone is operating. The page address decides while they're inside a game's section;
// otherwise the last game they chose, remembered in this browser, is used.
export function useGame() {
  const route = useRoute()
  const { t } = useSite()
  const remembered = useCookie<GameKey | null>('game', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', default: () => null })

  const current = computed<Game | null>(() => {
    const fromPath = route.path.split('/')[1]
    if (isGameKey(fromPath)) return gameByKey(fromPath)
    return isGameKey(remembered.value) ? gameByKey(remembered.value) : null
  })

  // The feature this page is, if it's one of the current game's.
  const feature = computed(() => current.value?.features.find((f) => f.to === route.path) ?? null)

  const labelOf = (f: GameFeature) => (f.wordingKey ? t(f.wordingKey) : f.label)

  function remember(key: GameKey) {
    if (remembered.value !== key) remembered.value = key
  }

  return { current, feature, labelOf, remembered, remember }
}
