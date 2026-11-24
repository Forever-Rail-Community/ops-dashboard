// Checks the "trains", "trainhistory" and "switches" parts of a Railroader report. Anything unexpected is dropped, and nothing is
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

const MAX_HISTORY_ROWS = 120 // 30 minutes at one sample every 20 seconds, with room to spare

// { minutes, trains: { <train id>: [[at, segment, end, distance, speedMph, x, z], ...] } }, oldest first.
export function parseTrainHistory(raw: unknown): RailroaderTrainHistory {
  const r = raw as { minutes?: unknown; trains?: unknown }
  if (!r?.trains || typeof r.trains !== 'object' || Array.isArray(r.trains)) throw bad('The train history report needs a "trains" object')
  const trains: Record<string, TrainHistoryRow[]> = {}
  for (const [id, rows] of Object.entries(r.trains).slice(0, MAX_TRAINS)) {
    if (!id || id.length > 60 || !Array.isArray(rows)) continue
    trains[id] = rows.slice(-MAX_HISTORY_ROWS).flatMap((row: any): TrainHistoryRow[] => {
      if (!Array.isArray(row) || !finite(row[0]) || ![row[3], row[4], row[5], row[6]].every(finite)) return []
      const track = parseLocation({ segment: row[1], end: row[2], distance: row[3] })
      return track ? [[row[0], track.segment, track.end, track.distance, round(Math.abs(row[4]), 1), round(row[5], 1), round(row[6], 1)]] : []
    })
  }
  return { minutes: finite(r.minutes) ? Math.max(1, Math.min(120, Math.round(r.minutes))) : 30, trains }
}
