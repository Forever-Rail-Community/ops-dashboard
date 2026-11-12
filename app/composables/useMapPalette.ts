// The map's colors for the current theme.
export function useMapPalette() {
  const { isDark } = useTheme()
  return computed(() => mapPalette(isDark.value))
}
