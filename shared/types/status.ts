import type { GameKey } from '../utils/gameKeys'

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
  // From the Forever Rail Signals mod (0.4.0+). Left out when it isn't reporting; joinCode is null when the railroad
  // isn't open to multiplayer. Only sent to people with the "multiplayer.joinCode" permission.
  multiplayer?: {
    joinCode: string | null
  }
}

// The "status" part of a server's report, one shape per game.
export interface Run8Status {
  system: SystemReport
  routes: RouteReport[]
  unmapped: { port: number; pid: number }[]
}

export interface RailroaderStatus {
  system: SystemReport
  railroader: RailroaderReport
}

export interface StatusByGame {
  run8: Run8Status
  railroader: RailroaderStatus
}

// The latest report of one kind (status, trains, ...) that the dashboard keeps for each server.
export interface StoredReport<Data> {
  agentId: string
  game: GameKey
  sentAt: string
  receivedAt: number // the dashboard's clock, so a wrong clock on a game server can't hide an outage
  data: Data
}

// A registered game server, as Admin > Servers lists it.
export interface AgentInfo {
  id: string
  game: GameKey
  createdAt: string
  createdByName: string
  lastReportAt: number | null
}

// What the dashboard receives. Each game has its own endpoint and only gets its own part of a report.
// Members get a reduced view (no system stats, pids, cpu, memory or error text).
export interface AgentBase {
  agentId: string
  ageSec: number
  stale: boolean
  system: SystemReport | null // the server machine itself, shown to staff in every game
}

export interface Run8Agent extends AgentBase {
  routes: RouteReport[]
  unmapped: { port: number; pid: number }[]
}

export interface RailroaderAgent extends AgentBase {
  railroader: RailroaderReport
}

export interface GameStatus<Agent extends AgentBase> {
  detailed: boolean
  agents: Agent[]
}
