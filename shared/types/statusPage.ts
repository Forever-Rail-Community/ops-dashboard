// What the status page's public GET /api/summary returns (its lib/summary.js). Only the fields the header uses.
export type StatusLevel = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'paused' | 'unknown'

export interface StatusComponent {
  id: string
  name: string
  status: StatusLevel
  components: StatusComponent[]
}

export interface StatusSummary {
  title: string
  url: string
  overall: StatusLevel
  generatedAt: string
  groups: { name: string; status: StatusLevel; components: StatusComponent[] }[]
}
