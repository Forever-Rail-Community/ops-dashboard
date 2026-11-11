// Turns one chosen color into the 11-shade scale the interface uses (50 lightest, 950 darkest).
// The chosen color itself is shade 500, which is what buttons and highlights use.
type RGB = [number, number, number]

const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB
const toHex = (c: RGB) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i]! - v) * t) as RGB

const TOWARD_WHITE: Record<number, number> = { 50: 0.95, 100: 0.88, 200: 0.74, 300: 0.56, 400: 0.3 }
const TOWARD_BLACK: Record<number, number> = { 600: 0.15, 700: 0.3, 800: 0.45, 900: 0.6, 950: 0.76 }

export function brandCss(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return ''
  const base = toRgb(hex)
  const shades: Record<number, string> = { 500: hex.toLowerCase() }
  for (const [k, t] of Object.entries(TOWARD_WHITE)) shades[+k] = toHex(mix(base, [255, 255, 255], t))
  for (const [k, t] of Object.entries(TOWARD_BLACK)) shades[+k] = toHex(mix(base, [0, 0, 0], t))
  const vars = Object.entries(shades).map(([k, v]) => `--color-brand-${k}:${v}`).join(';')
  // ":root:root" outranks the default palette no matter which stylesheet loads first.
  return `:root:root{${vars}}`
}
