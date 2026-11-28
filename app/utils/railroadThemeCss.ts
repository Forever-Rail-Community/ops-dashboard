// Turns the railroad themes (shared/utils/railroadThemes.ts) into the shadcn theme variables, one block per theme,
// switched on by data-railroad on <html> (see useRailroadTheme). The selectors outrank the brand color from
// Admin > Appearance (brandCss), so a railroad theme wins; the default theme sets no attribute and keeps the brand.

const mix = (color: string, amount: number, base: string) => `color-mix(in oklab, ${color} ${amount}%, ${base})`

function themeCss(t: RailroadTheme): string {
  const on = `html:root[data-railroad="${t.key}"]`
  const sidebar = [
    `--sidebar:${t.sidebar}`,
    `--sidebar-foreground:${t.onSidebar}`,
    `--sidebar-accent:${mix(t.onSidebar, 12, t.sidebar)}`,
    `--sidebar-accent-foreground:${t.onSidebar}`,
    `--sidebar-border:${mix(t.onSidebar, 14, t.sidebar)}`,
    `--sidebar-primary:${t.highlight}`,
    `--sidebar-primary-foreground:${t.sidebar}`,
    `--sidebar-ring:${t.highlight}`
  ]
  const mode = (m: 'light' | 'dark') => [
    `--primary:${t.primary[m]}`,
    `--primary-foreground:${t.onPrimary[m]}`,
    `--ring:${t.primary[m]}`,
    ...(t.info ? [`--info:${t.info[m]}`, `--info-foreground:${t.info[m]}`, `--link:${t.info[m]}`] : [])
  ]
  return [
    `${on}{${[...sidebar, ...mode('light')].join(';')}}`,
    `html.dark:root[data-railroad="${t.key}"]{${mode('dark').join(';')}}`,
    // Muted text in the sidebar (the subtitle, your roles) is the sidebar's own text, dimmed but still readable.
    `${on} [data-sidebar="sidebar"]{--muted-foreground:${mix(t.onSidebar, 85, t.sidebar)}}`,
    // The current page gets a marker in the highlight color.
    `${on} [data-sidebar="sidebar"] :is([data-sidebar="menu-button"],[data-sidebar="menu-sub-button"])[data-active="true"]{box-shadow:inset 3px 0 0 var(--sidebar-primary)}`
  ].join('\n')
}

export const RAILROAD_THEME_CSS = RAILROAD_THEMES.map(themeCss).join('\n')
