// Checks the "trains" and "switches" parts of a Railroader report. Anything unexpected is dropped, and nothing is
// trusted as markup.

const MAX_TRAINS = 300
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const GAME_ID = /^[A-Za-z0-9_-]{1,40}$/
const MAX_SWITCHES = 2000

function parseLocation(raw: any): TrackLocation | undefined {
  if (!raw || typeof raw.segment !== 'string' || !GAME_ID.test(raw.segment)) return undefined
  if ((raw.end !== 'A' && raw.end !== 'B') || !finite(raw.distance)) return undefined
  return { segment: raw.segment, end: raw.end, distance: round(Math.max(0, raw.distance), 2) }
}

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
      cars: finite(t.cars) ? Math.max(1, Math.min(500, Math.round(t.cars))) : 1,
      track: parseLocation(t.track)
    }]
  })
  return { trains }
}

export function parseSwitches(raw: unknown): RailroaderSwitches {
  const thrown = (raw as { thrown?: unknown })?.thrown
  if (!thrown || typeof thrown !== 'object' || Array.isArray(thrown)) throw bad('The switches report needs a "thrown" object')
  const clean: Record<string, boolean> = {}
  for (const [id, value] of Object.entries(thrown).slice(0, MAX_SWITCHES)) {
    if (GAME_ID.test(id) && typeof value === 'boolean') clean[id] = value
  }
  return { thrown: clean }
}
