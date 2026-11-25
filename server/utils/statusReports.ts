// Checks the status part of a server's report. Anything unexpected is dropped, and nothing is trusted as markup.

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

const STATES = ['menu', 'loading', 'active', 'unloading']
const MAX_PLAYERS = 100
const text = (v: unknown, max = 60): string | null =>
  typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null

function parseRailroader(raw: any): RailroaderReport {
  if (!raw || typeof raw !== 'object') throw bad('Missing the railroader part of the status report')
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
  if (raw.multiplayer && typeof raw.multiplayer === 'object') {
    // A join code is short letters and digits; anything else is dropped rather than shown.
    const code = text(raw.multiplayer.joinCode, 16)
    report.multiplayer = { joinCode: code && /^[A-Za-z0-9]+$/.test(code) ? code : null }
  }
  if (Array.isArray(raw.players)) {
    report.players = raw.players.slice(0, MAX_PLAYERS).flatMap((p: unknown) => (text(p, 40) ? [text(p, 40)!] : []))
  }
  return report
}

const parseSystem = (raw: any): SystemReport => ({
  cpuPct: num(raw?.cpuPct) ?? 0,
  memUsedMb: num(raw?.memUsedMb) ?? 0,
  memTotalMb: num(raw?.memTotalMb) ?? 0
})

function parseRoutes(raw: unknown): RouteReport[] {
  if (!Array.isArray(raw) || raw.length > 50) throw bad('Invalid routes')
  return raw.map((r: any) => {
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
}

const parseUnmapped = (raw: unknown) =>
  (Array.isArray(raw) ? raw : []).slice(0, 20).flatMap((u: any) => {
    const port = num(u?.port)
    const pid = num(u?.pid)
    return port !== null && pid !== null ? [{ port, pid }] : []
  })

const asObject = (raw: unknown): Record<string, any> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad('The status report must be a JSON object')
  return raw as Record<string, any>
}

export function parseRun8Status(raw: unknown): Run8Status {
  const s = asObject(raw)
  return { system: parseSystem(s.system), routes: parseRoutes(s.routes), unmapped: parseUnmapped(s.unmapped) }
}

export function parseRailroaderStatus(raw: unknown): RailroaderStatus {
  const s = asObject(raw)
  return { system: parseSystem(s.system), railroader: parseRailroader(s.railroader) }
}
