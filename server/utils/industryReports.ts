// Checks the "industries" part of a Railroader report: cars at industries and passengers waiting.
// Anything unexpected is dropped, and nothing is trusted as markup.

const MAX_INDUSTRIES = 300
const MAX_CARS_PER_INDUSTRY = 200
const MAX_LOADS = 6
const MAX_STOPS = 100
const ID = /^[A-Za-z0-9_.-]{1,60}$/
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const entries = (v: unknown, max: number) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).slice(0, max) : [])

function parseCar(raw: any): CarAtIndustry[] {
  if (typeof raw?.id !== 'string' || !ID.test(raw.id)) return []
  const loads = (Array.isArray(raw.loads) ? raw.loads : []).slice(0, MAX_LOADS).flatMap((l: any): CarLoad[] =>
    typeof l?.name === 'string' && l.name && finite(l.quantity) ? [{ name: l.name.slice(0, 40), quantity: Math.round(l.quantity * 10) / 10 }] : []
  )
  const w = raw.waybill
  const waybill = typeof w?.destination === 'string' && ID.test(w.destination) ? { destination: w.destination, completed: w.completed === true } : null
  return [{ id: raw.id, name: text(raw.name, 40) || raw.id, type: text(raw.type, 8), loads, waybill }]
}

export function parseIndustries(raw: unknown): RailroaderIndustries {
  const r = raw as { cars?: unknown; passengers?: unknown }
  if (!r || typeof r !== 'object') throw createError({ statusCode: 400, statusMessage: 'The industries report must be an object' })

  const cars: RailroaderIndustries['cars'] = {}
  for (const [industry, list] of entries(r.cars, MAX_INDUSTRIES)) {
    if (!ID.test(industry) || !Array.isArray(list)) continue
    const parsed = list.slice(0, MAX_CARS_PER_INDUSTRY).flatMap(parseCar)
    if (parsed.length) cars[industry] = parsed
  }

  const passengers: RailroaderIndustries['passengers'] = {}
  for (const [industry, value] of entries(r.passengers, MAX_STOPS)) {
    const v = value as { stop?: unknown; waiting?: unknown }
    if (!ID.test(industry) || typeof v?.stop !== 'string' || !ID.test(v.stop)) continue
    const waiting: Record<string, number> = {}
    for (const [destination, count] of entries(v.waiting, MAX_STOPS)) {
      if (ID.test(destination) && finite(count) && count > 0) waiting[destination] = Math.round(count)
    }
    passengers[industry] = { stop: v.stop, waiting }
  }
  return { cars, passengers }
}
