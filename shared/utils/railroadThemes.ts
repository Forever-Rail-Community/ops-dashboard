// Railroad-inspired themes. Each person picks one (saved with their preferences); "default" is the site's own look,
// with the brand color from Admin > Appearance. Names say "-inspired": the colors and letters echo each railroad's
// paint, but there are no logos, and the fonts are free lookalikes, not the railroads' own lettering.
//
// Each theme's colors, and what they're for (app/utils/railroadThemeCss.ts turns them into the shadcn variables):
//   sidebar / onSidebar   the sidebar and the text on it, in light and dark mode alike
//   highlight             the marker on the current page in the sidebar
//   primary / onPrimary   buttons and focus rings, per mode
//   info                  information colors (blue pills and notices, votes, links), per mode; themes without a
//                         third paint color keep the site's own blue
// Sources: Brandfetch for CSX, Conrail and CPKC; UP's own web values (via utahrails.net) for UP. Values marked
// "approximation" are my reading of the paint, with no official value to go on.

export type RailroadThemeKey = 'default' | 'csx' | 'up' | 'ns' | 'conrail' | 'cpkc'

interface PerMode {
  light: string
  dark: string
}

export interface RailroadTheme {
  key: Exclude<RailroadThemeKey, 'default'>
  name: string
  // The reporting mark set faint up the sidebar, and the free font it's drawn in.
  mark: string
  markFont: string
  markWeight: number
  sidebar: string
  onSidebar: string
  highlight: string
  primary: PerMode
  onPrimary: PerMode
  info?: PerMode
}

export const RAILROAD_THEMES: RailroadTheme[] = [
  {
    key: 'csx', name: 'CSX-inspired', mark: 'CSXT', markFont: '"Arvo", serif', markWeight: 700,
    // Yellow: approximation of the paint. Dark-mode info: cobalt lightened so it reads on black.
    sidebar: '#003462', onSidebar: '#ffffff', highlight: '#F5B700',
    primary: { light: '#003EA8', dark: '#F5B700' }, onPrimary: { light: '#ffffff', dark: '#14181f' },
    info: { light: '#003EA8', dark: '#6C9CFF' }
  },
  {
    key: 'up', name: 'Union Pacific-inspired', mark: 'UP', markFont: '"Jost", sans-serif', markWeight: 700,
    // Armour Yellow is UP's #FFCC00, toned down so it doesn't glare. Blue: approximation of the shield blue.
    sidebar: '#E6B800', onSidebar: '#1a1a1a', highlight: '#D10000',
    primary: { light: '#D10000', dark: '#E6B800' }, onPrimary: { light: '#ffffff', dark: '#1a1a1a' },
    info: { light: '#1F4A9C', dark: '#7D9FE0' }
  },
  {
    key: 'ns', name: 'Norfolk Southern-inspired', mark: 'NS', markFont: '"Oswald", sans-serif', markWeight: 700,
    // Black and white, from the paint.
    sidebar: '#121212', onSidebar: '#ffffff', highlight: '#ffffff',
    primary: { light: '#121212', dark: '#f4f4f5' }, onPrimary: { light: '#ffffff', dark: '#121212' }
  },
  {
    key: 'conrail', name: 'Conrail-inspired', mark: 'CR', markFont: '"Montserrat", sans-serif', markWeight: 700,
    // Light-mode info: a mid blue between Conrail's two (my pick).
    sidebar: '#10204B', onSidebar: '#ffffff', highlight: '#9AD6F3',
    primary: { light: '#10204B', dark: '#9AD6F3' }, onPrimary: { light: '#ffffff', dark: '#10204B' },
    info: { light: '#1F5F99', dark: '#9AD6F3' }
  },
  {
    key: 'cpkc', name: 'CPKC-inspired', mark: 'CPKC', markFont: '"Archivo Black", sans-serif', markWeight: 400,
    sidebar: '#8f0021', onSidebar: '#ffffff', highlight: '#FFC845',
    primary: { light: '#C2002F', dark: '#FFC845' }, onPrimary: { light: '#ffffff', dark: '#1a0a0d' }
  }
]

export const DEFAULT_RAILROAD_THEME: RailroadThemeKey = 'default'

export const RAILROAD_THEME_OPTIONS: { value: RailroadThemeKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  ...RAILROAD_THEMES.map((t) => ({ value: t.key, label: t.name }))
]

export const isRailroadTheme = (value: unknown): value is RailroadThemeKey =>
  RAILROAD_THEME_OPTIONS.some((o) => o.value === value)

export const railroadTheme = (key: RailroadThemeKey) => RAILROAD_THEMES.find((t) => t.key === key)

// Every mark is drawn at one letter height, so the railroads look alike. That height is set so the longest mark still
// fits: CPKC in Archivo Black, whose letters run 4.35 times their cap height (measured with canvas measureText).
// Measure again if a mark or its font changes.
export const LONGEST_MARK_LENGTH = 4.35
