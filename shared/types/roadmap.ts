// The roadmap (items staff plan and ship) and feature requests (members suggest and vote; staff accept, decline or
// merge them). Accepting a request puts it on the roadmap; completing an item can go into a What's new update.

// The part of the Operations Center an item or request is about. Also the roadmap's filters.
export type RoadmapScope = 'dashboard' | 'railroader' | 'run8' | 'map' | 'help'
export const ROADMAP_SCOPES: { value: RoadmapScope; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'railroader', label: 'Railroader' },
  { value: 'run8', label: 'Run8' },
  { value: 'map', label: 'Map' },
  { value: 'help', label: 'Help center' }
]

export type RoadmapStatus = 'planned' | 'next' | 'progress' | 'complete'
export const ROADMAP_COLUMNS: { value: RoadmapStatus; label: string; hint: string }[] = [
  { value: 'planned', label: 'Planned', hint: 'Decided on, not started yet' },
  { value: 'next', label: 'Up next', hint: 'Starting once the current work ships' },
  { value: 'progress', label: 'In progress', hint: 'Being built right now' },
  { value: 'complete', label: 'Complete', hint: 'Shipped. See What’s new for details' }
]

export interface RoadmapItem {
  id: number
  title: string
  description: string
  scope: RoadmapScope
  status: RoadmapStatus
  // The feature request it came from, if any: its votes, and whether you voted, are the item's.
  requestId: number | null
  votes: number
  voted: boolean
  requestedBy: string | null
  requestedAt: string | null
  shippedIn: { id: number; title: string; publishedAt: string } | null // the What's new update it went out in
  bugReports: number // confirmed bug reports linked to it; more than 0 makes it a bug fix
  history: { status: RoadmapStatus; at: string }[] // each column it has been in, oldest first
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
