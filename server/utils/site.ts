// The settings every visitor needs (name, logo, color, wording). Falls back to defaults if the
// database is unreachable, so the sign-in page always renders.
export async function loadSite(): Promise<SiteSettings> {
  try {
    const sql = await db()
    const [row] = await sql<{ value: Partial<SiteSettings> }[]>`SELECT value FROM settings WHERE key = 'site'`
    const stored = row?.value ?? {}
    return {
      ...DEFAULT_SITE,
      ...stored,
      labels: { ...DEFAULT_LABELS, ...(stored.labels ?? {}) }
    }
  } catch (err) {
    console.error('could not load site settings', err)
    return DEFAULT_SITE
  }
}

const LOGO_DATA = /^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

export function validateSite(body: any): SiteSettings {
  if (!body || typeof body !== 'object') throw bad('Invalid settings')

  const text = (v: unknown, field: string, max: number, required = true) => {
    const s = typeof v === 'string' ? v.trim() : ''
    if ((required && !s) || s.length > max) throw bad(`${field} must be ${required ? '1' : '0'} to ${max} characters`)
    return s
  }

  const name = text(body.name, 'Name', 60)
  const subtitle = text(body.subtitle, 'Subtitle', 60, false)

  const brandColor = String(body.brandColor ?? '')
  if (!/^#[0-9a-fA-F]{6}$/.test(brandColor)) throw bad('Color must look like #2f77a5')

  const logo = String(body.logo ?? '')
  const logoOk =
    logo === '/logo.svg' ||
    (logo.startsWith('https://') && logo.length <= 500) ||
    (LOGO_DATA.test(logo) && logo.length <= 400_000)
  if (!logoOk) throw bad('Logo must be a PNG, JPG, WebP, or SVG under 250 KB')

  const labels: Record<string, string> = {}
  for (const f of LABEL_FIELDS) {
    labels[f.key] = text(body.labels?.[f.key] ?? f.fallback, f.title, 40)
  }

  return { name, subtitle, logo, brandColor: brandColor.toLowerCase(), labels }
}
