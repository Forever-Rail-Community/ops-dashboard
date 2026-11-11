// Words the interface uses. Admins can rename any of these on the Appearance page.
export const LABEL_FIELDS = [
  { key: 'pageTitle', title: 'Home page title', fallback: 'Route status' },
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
  labels: Record<string, string>
}

export const DEFAULT_SITE: SiteSettings = {
  name: 'Forever Rail',
  subtitle: 'Operations',
  logo: '/logo.svg',
  brandColor: '#2f77a5',
  labels: DEFAULT_LABELS
}
