// An address from a setting, made safe to link to: without a scheme ("status.example.com"), a browser treats it as a
// path on this site, so https:// is added. Trailing slashes go. '' stays ''.
export function absoluteUrl(address: string) {
  const trimmed = address.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
