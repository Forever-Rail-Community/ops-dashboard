// The CTC board's lines: worked out from the game's layout (shared/utils/ctcLine.ts), then saved with the names and
// mileposts staff give them. The board reads them from the database once per page load; the live states come with
// the map's live data, so a board adds no Redis traffic of its own.

const ID = /^[a-z0-9-]{2,40}$/
const BLOCK = /^[A-Za-z0-9_.-]{1,80}$/
const MAX_TOWNS = 200
const MAX_VIA = 20
const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

interface LineRow {
  id: string
  name: string
  data: CtcLineData
  updated_at: Date
  updated_by: string
}

export async function listLines(): Promise<CtcLine[]> {
  const sql = await db()
  const rows = await sql<LineRow[]>`SELECT id, name, data, updated_at, updated_by FROM ctc_lines ORDER BY name`
  return rows.map((r) => ({ id: r.id, name: r.name, ...r.data, updatedAt: r.updated_at.toISOString(), updatedBy: r.updated_by }))
}

export async function saveLine(id: string, name: string, data: CtcLineData, user: { name: string }) {
  const sql = await db()
  await sql`INSERT INTO ctc_lines (id, name, data, updated_by) VALUES (${id}, ${name}, ${sql.json(data as never)}, ${user.name})
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, data = EXCLUDED.data, updated_at = now(), updated_by = EXCLUDED.updated_by`
}

export async function deleteLine(id: string) {
  const sql = await db()
  await sql`DELETE FROM ctc_lines WHERE id = ${id}`
}

// The lines the game's layout describes right now, merged across servers, longest first.
export async function linesFromGame(): Promise<CtcLineData[]> {
  const reports = await latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  const layout: RailroaderSignalLayout = {
    signals: reports.flatMap(({ stored }) => stored.data.signals),
    blocks: reports.flatMap(({ stored }) => stored.data.blocks),
    switchLegs: Object.assign({}, ...reports.map(({ stored }) => stored.data.switchLegs ?? {})),
    controlPoints: reports.flatMap(({ stored }) => stored.data.controlPoints ?? [])
  }
  if (!layout.controlPoints.length) return []
  const map = await useStorage('assets:server').getItem<MapData>('map.json')
  if (!map) throw createError({ statusCode: 500, statusMessage: 'Map data not found' })
  return deriveLines(layout, map)
}

// A line as sent from the Admin page: its id, name and towns. Checked piece by piece; nothing is trusted as markup.
export function parseLineInput(id: unknown, body: unknown): { id: string; name: string; data: CtcLineData } {
  if (typeof id !== 'string' || !ID.test(id)) throw bad('Use 2 to 40 lowercase letters, numbers, and dashes for the line\'s id.')
  const b = body as { name?: unknown; towns?: unknown; links?: unknown }
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : ''
  if (!name) throw bad('Give the line a name.')
  if (!Array.isArray(b.towns) || !b.towns.length || b.towns.length > MAX_TOWNS) throw bad('A line needs its towns.')
  if (!Array.isArray(b.links) || b.links.length !== b.towns.length - 1) throw bad('A line needs a link between each pair of towns.')
  const blocks = (v: unknown, what: string) => {
    if (!Array.isArray(v) || v.length > MAX_VIA || !v.every((x) => typeof x === 'string' && BLOCK.test(x))) throw bad(`A town's ${what} isn't a list of block ids.`)
    return v as string[]
  }
  const towns = b.towns.map((t: any): CtcTown => {
    const townName = typeof t?.name === 'string' ? t.name.trim().slice(0, 60) : ''
    if (!townName) throw bad('Every town needs a name.')
    const controlPoints = blocks(t.controlPoints, 'control point list')
    if (controlPoints.length < 1 || controlPoints.length > 2) throw bad(`${townName} needs one or two control points.`)
    const town: CtcTown = {
      name: townName,
      controlPoints,
      main: blocks(t.main, 'main'),
      sidings: Array.isArray(t.sidings) ? t.sidings.slice(0, 4).map((s: unknown) => blocks(s, 'siding')) : [],
      deadEnds: Array.isArray(t.deadEnds) ? t.deadEnds.slice(0, 8).map((d: any) => ({ from: blocks([d?.from], 'dead end')[0]!, via: blocks(d?.via, 'dead end') })) : [],
      mainCertain: t.mainCertain === true
    }
    if (typeof t.milepost === 'number' && Number.isFinite(t.milepost) && t.milepost >= 0 && t.milepost < 10000) town.milepost = Math.round(t.milepost * 10) / 10
    return town
  })
  const links = b.links.map((l: any): CtcLink => ({ from: blocks([l?.from], 'link')[0]!, to: blocks([l?.to], 'link')[0]!, via: blocks(l?.via, 'link') }))
  return { id, name, data: { towns, links } }
}
