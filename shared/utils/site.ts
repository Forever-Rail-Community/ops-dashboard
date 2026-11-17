// Words the interface uses. Admins can rename any of these on the Appearance page.
export const LABEL_FIELDS = [
  { key: 'pageTitle', title: 'Run8 status page title', fallback: 'Route status' },
  { key: 'route', title: 'One route', fallback: 'Route' },
  { key: 'routes', title: 'Several routes', fallback: 'Routes' },
  { key: 'server', title: 'Game server', fallback: 'Server' },
  { key: 'desk', title: 'One dispatcher desk', fallback: 'Desk' },
  { key: 'desks', title: 'Several dispatcher desks', fallback: 'Desks' },
  { key: 'train', title: 'One train', fallback: 'Train' },
  { key: 'trains', title: 'Several trains', fallback: 'Trains' },
  { key: 'crew', title: 'Crew', fallback: 'Crew' },
  { key: 'bulletin', title: 'One bulletin', fallback: 'Bulletin' },
  { key: 'bulletins', title: 'Several bulletins', fallback: 'Bulletins' }
] as const

export const DEFAULT_LABELS: Record<string, string> = Object.fromEntries(
  LABEL_FIELDS.map((l) => [l.key, l.fallback])
)

export interface SiteSettings {
  name: string
  subtitle: string
  logo: string // '/logo.svg', an https URL, or a small data: image
  brandColor: string // '#rrggbb'
  // Accent colors for the public help site, one for light mode and one for dark mode ('#rrggbb').
  helpLightAccent: string
  helpDarkAccent: string
  // Background image for the help site's home page search area ('' for none), and how strongly the
  // accent color covers it, 0 to 100. The help site raises it if text over the image would be hard to read.
  helpHeroImage: string
  helpHeroOverlay: number
  // The sign-in page: the Discord role members need (named in the note under the button), and whether the live
  // background with what's running on the servers is shown. It's public, so admins can turn it off.
  memberRole: string
  loginLive: boolean
  labels: Record<string, string>
}

export const DEFAULT_SITE: SiteSettings = {
  name: 'Forever Rail',
  subtitle: 'Operations',
  logo: '/logo.svg',
  brandColor: '#2f77a5',
  helpLightAccent: '#f2b134', // the orange in the Forever Rail logo
  helpDarkAccent: '#8b5cf6',
  helpHeroImage: '',
  helpHeroOverlay: 80,
  memberRole: 'Community Member',
  loginLive: true,
  labels: DEFAULT_LABELS
}
