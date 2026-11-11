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

export interface Snapshot {
  agentId: string
  sentAt: string
  system: SystemReport
  routes: RouteReport[]
  unmapped: { port: number; pid: number }[]
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
}

export interface StatusResponse {
  detailed: boolean
  staleAfterSec: number
  agents: AgentStatus[]
}
