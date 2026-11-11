// Turns the brand color chosen in Admin > Appearance into the shadcn theme variables that
// buttons, focus rings, and the active sidebar item use. Text on the color is picked for contrast.
const channel = (v: number) => {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) =>
  0.2126 * channel(parseInt(hex.slice(1, 3), 16)) +
  0.7152 * channel(parseInt(hex.slice(3, 5), 16)) +
  0.0722 * channel(parseInt(hex.slice(5, 7), 16))

export function brandCss(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return ''
  const l = luminance(hex)
  const onWhite = 1.05 / (l + 0.05)
  const onDark = (l + 0.05) / (luminance('#0a0a0a') + 0.05)
  const fg = onWhite >= onDark ? '#ffffff' : '#0a0a0a'
  return `:root:root{--primary:${hex};--primary-foreground:${fg};--ring:${hex};--sidebar-primary:${hex};--sidebar-primary-foreground:${fg}}`
}
