export function formatDuration(sec?: number | null): string {
  if (sec == null) return 'Unknown'
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  if (sec < 3600) return `${m}m`
  const h = Math.floor(sec / 3600)
  if (sec < 86400) return `${h}h ${m % 60}m`
  const d = Math.floor(sec / 86400)
  return `${d}d ${h % 24}h`
}

export function formatAge(sec: number): string {
  return sec < 5 ? 'just now' : `${formatDuration(sec)} ago`
}
