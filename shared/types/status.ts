export interface RouteReport {
  name: string
  port: number
  status: 'online' | 'offline'
  pid?: number | null
  uptimeSec?: number | null
  cpuPct?: number | null
  memMb?: number | null
}

export interface SystemReport {
  cpuPct: number
  memUsedMb: number
  memTotalMb: number
}

export interface RailroaderReport {
  process: {
    status: 'online' | 'offline'
    pid?: number | null
    uptimeSec?: number | null
    cpuPct?: number | null
    memMb?: number | null
  }
  // Only present when the game process is running. "reachable" means the game's local HTTP server answered.
  api?: {
    reachable: boolean
    error?: string | null
    gameVersion?: string | null
    sessionState?: 'menu' | 'loading' | 'active' | 'unloading' | null
    railroadName?: string | null
    gameMode?: string | null
  }
}

export interface Snapshot {
  agentId: string
  sentAt: string
  system: SystemReport
  routes: RouteReport[]
  unmapped: { port: number; pid: number }[]
  railroader?: RailroaderReport | null
}

// What the dashboard receives. Members get a reduced view (no system stats, pids, cpu or memory).
export interface AgentStatus {
  agentId: string
  sentAt: string
  receivedAt: number
  ageSec: number
  stale: boolean
  system: SystemReport | null
  routes: RouteReport[]
  unmapped: { port: number; pid: number }[]
  railroader: RailroaderReport | null
}

export interface StatusResponse {
  detailed: boolean
  staleAfterSec: number
  agents: AgentStatus[]
}
