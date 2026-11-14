// Checks the "trains" part of a Railroader report. Anything unexpected is dropped, and nothing is trusted as markup.

const MAX_TRAINS = 300
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d

export function parseTrains(raw: unknown): RailroaderTrains {
  const list = (raw as { trains?: unknown })?.trains
  if (!Array.isArray(list)) throw bad('The trains report needs a "trains" list')

  const trains = list.slice(0, MAX_TRAINS).flatMap((t: any): TrainReport[] => {
    if (typeof t?.id !== 'string' || !t.id || !finite(t.x) || !finite(t.z)) return []
    return [{
      id: t.id.slice(0, 60),
      name: typeof t.name === 'string' && t.name ? t.name.slice(0, 40) : t.id.slice(0, 40),
      x: round(t.x, 1),
      z: round(t.z, 1),
      heading: finite(t.heading) ? round(((t.heading % 360) + 360) % 360, 1) : 0,
      speedMph: finite(t.speedMph) ? round(Math.abs(t.speedMph), 1) : 0,
      cars: finite(t.cars) ? Math.max(1, Math.min(500, Math.round(t.cars))) : 1
    }]
  })
  return { trains }
}
