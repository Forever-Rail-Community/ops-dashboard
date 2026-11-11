const ID = /^[\w.-]{1,40}$/

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

const STATES = ['menu', 'loading', 'active', 'unloading']
const text = (v: unknown, max = 60): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null

function parseRailroader(raw: any): RailroaderReport | null {
  if (!raw || typeof raw !== 'object') return null
  const proc = raw.process ?? {}
  const report: RailroaderReport = {
    process: {
      status: proc.status === 'online' ? 'online' : 'offline',
      pid: num(proc.pid),
      uptimeSec: num(proc.uptimeSec),
      cpuPct: num(proc.cpuPct),
      memMb: num(proc.memMb)
    }
  }
  if (raw.api && typeof raw.api === 'object') {
    report.api = {
      reachable: raw.api.reachable === true,
      error: text(raw.api.error, 120),
      gameVersion: text(raw.api.gameVersion, 30),
      sessionState: STATES.includes(raw.api.sessionState) ? raw.api.sessionState : null,
      railroadName: text(raw.api.railroadName),
      gameMode: text(raw.api.gameMode)
    }
  }
  return report
}

// Validates what the agent sends. Anything unexpected is dropped, and nothing is trusted as markup.
export function parseSnapshot(body: unknown): Snapshot {
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object')
  const b = body as Record<string, any>

  if (typeof b.agentId !== 'string' || !ID.test(b.agentId)) throw bad('Invalid agentId')
  if (!Array.isArray(b.routes) || b.routes.length > 50) throw bad('Invalid routes')

  const routes: RouteReport[] = b.routes.map((r: any) => {
    const port = num(r?.port)
    if (typeof r?.name !== 'string' || r.name.length === 0 || r.name.length > 60 || port === null) {
      throw bad('Invalid route entry')
    }
    return {
      name: r.name,
      port,
      status: r.status === 'online' ? 'online' : 'offline',
      pid: num(r.pid),
      uptimeSec: num(r.uptimeSec),
      cpuPct: num(r.cpuPct),
      memMb: num(r.memMb)
    }
  })

  const unmapped = (Array.isArray(b.unmapped) ? b.unmapped : [])
    .slice(0, 20)
    .flatMap((u: any) => {
      const port = num(u?.port)
      const pid = num(u?.pid)
      return port !== null && pid !== null ? [{ port, pid }] : []
    })

  return {
    agentId: b.agentId,
    sentAt: typeof b.sentAt === 'string' ? b.sentAt.slice(0, 40) : '',
    system: {
      cpuPct: num(b.system?.cpuPct) ?? 0,
      memUsedMb: num(b.system?.memUsedMb) ?? 0,
      memTotalMb: num(b.system?.memTotalMb) ?? 0
    },
    routes,
    unmapped,
    railroader: parseRailroader(b.railroader)
  }
}
