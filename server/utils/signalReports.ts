// Checks the "signallayout" and "signals" parts of a Railroader report. Anything unexpected is dropped, and
// nothing is trusted as markup.

const ID = /^[A-Za-z0-9_.-]{1,80}$/
const MAX_SIGNALS = 2000
const MAX_BLOCKS = 2000
const MAX_SWITCHES = 5000
const MAX_PIECES = 200 // per block
const MAX_POINTS = 400 // per piece
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const entries = (v: unknown, max: number) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v).slice(0, max) : [])

function parsePiece(raw: unknown): [number, number][] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_POINTS).flatMap((p: any): [number, number][] => (Array.isArray(p) && finite(p[0]) && finite(p[1]) ? [[round(p[0], 1), round(p[1], 1)]] : []))
}

export function parseSignalLayout(raw: unknown): RailroaderSignalLayout {
  const r = raw as { signals?: unknown; blocks?: unknown; switchLegs?: unknown }
  if (!Array.isArray(r?.signals) || !Array.isArray(r?.blocks)) throw bad('The signal layout needs "signals" and "blocks" lists')
  const signals = r.signals.slice(0, MAX_SIGNALS).flatMap((s: any): SignalDef[] => {
    if (typeof s?.id !== 'string' || !ID.test(s.id) || !finite(s.x) || !finite(s.z)) return []
    const dx = finite(s.dx) ? s.dx : 0
    const dz = finite(s.dz) ? s.dz : 0
    const name = typeof s.name === 'string' ? s.name.slice(0, 60) : ''
    const def: SignalDef = { id: s.id, x: round(s.x, 1), z: round(s.z, 1), dx: round(dx, 3), dz: round(dz, 3), name }
    if (typeof s.intermediate === 'boolean') def.intermediate = s.intermediate
    return [def]
  })
  const blocks = r.blocks.slice(0, MAX_BLOCKS).flatMap((b: any): BlockDef[] => {
    if (typeof b?.id !== 'string' || !ID.test(b.id) || !Array.isArray(b.track)) return []
    const track = b.track.slice(0, MAX_PIECES).map(parsePiece).filter((piece: [number, number][]) => piece.length >= 2)
    return [{ id: b.id, track }]
  })
  const switchLegs: Record<string, [string, string]> = {}
  for (const [id, legs] of entries(r.switchLegs, MAX_SWITCHES)) {
    if (ID.test(id) && Array.isArray(legs) && legs.length === 2 && legs.every((leg) => typeof leg === 'string' && ID.test(leg))) {
      switchLegs[id] = [legs[0], legs[1]]
    }
  }
  return { signals, blocks, switchLegs }
}

export function parseSignals(raw: unknown): RailroaderSignals {
  const r = raw as { aspects?: unknown; occupied?: unknown }
  if (!r || typeof r !== 'object') throw bad('The signals report must be an object')
  const aspects: Record<string, SignalAspect> = {}
  for (const [id, aspect] of entries(r.aspects, MAX_SIGNALS)) {
    if (ID.test(id) && SIGNAL_ASPECTS.includes(aspect as SignalAspect)) aspects[id] = aspect as SignalAspect
  }
  const occupied: Record<string, boolean> = {}
  for (const [id, value] of entries(r.occupied, MAX_BLOCKS)) {
    if (ID.test(id) && typeof value === 'boolean') occupied[id] = value
  }
  return { aspects, occupied }
}
