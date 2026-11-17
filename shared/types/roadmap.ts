// The roadmap (items staff plan and ship) and feature requests (members suggest and vote; staff accept, decline or
// merge them). Accepting a request puts it on the roadmap; completing an item can go into a What's new update.

export type RoadmapScope = 'run8' | 'railroader' | 'dashboard'
export const ROADMAP_SCOPES: { value: RoadmapScope; label: string }[] = [
  { value: 'run8', label: 'Run8' },
  { value: 'railroader', label: 'Railroader' },
  { value: 'dashboard', label: 'Dashboard' }
]

export type RoadmapStatus = 'planned' | 'progress' | 'complete'
export const ROADMAP_COLUMNS: { value: RoadmapStatus; label: string; hint: string }[] = [
  { value: 'planned', label: 'Planned', hint: 'Decided, not started' },
  { value: 'progress', label: 'In progress', hint: 'Being built now' },
  { value: 'complete', label: 'Complete', hint: 'Shipped' }
]

export interface RoadmapItem {
  id: number
  title: string
  description: string
  scope: RoadmapScope
  status: RoadmapStatus
  votes: number // from the feature request it came from, if any
  requestedBy: string | null // who asked for it, when it came from a request
  shippedIn: { id: number; title: string; publishedAt: string } | null // the What's new update it went out in
  updatedAt: string
}

export type RequestStatus = 'open' | 'accepted' | 'declined' | 'merged'

export interface FeatureRequest {
  id: number
  title: string
  body: string
  scope: RoadmapScope
  author: string
  mine: boolean
  createdAt: string
  status: RequestStatus
  reply: string // staff's answer, shown on the request ('' for none); for a declined one, the reason
  votes: number
  voted: boolean
  mergedInto: { id: number; title: string } | null
  hidden: boolean // only staff see hidden requests
}

export const ROADMAP_LIMITS = { title: 120, body: 2000, reply: 1000, requestsPerDay: 5 }
