// Bug reports: private to the person who reported them and staff ("bugs.manage"). Up to BUG_LIMITS.screenshots
// screenshots each, kept in a private store.

export type BugStatus = 'new' | 'confirmed' | 'fixed' | 'wontfix'
export const BUG_STATUSES: { value: BugStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'fixed', label: 'Fixed' },
  { value: 'wontfix', label: "Won't fix" }
]

// Where in the dashboard the problem is: the same parts What's new uses, and a catch-all.
export const BUG_AREAS = [...UPDATE_AREAS, 'Somewhere else']

export interface BugReport {
  id: number
  title: string
  body: string
  area: string
  author: string
  mine: boolean
  status: BugStatus
  reply: string // staff's answer, shown to the reporter ('' for none)
  roadmapItem: { id: number; title: string } | null
  screenshots: number[] // ids; each is GET /api/bugs/screenshots/<id>
  createdAt: string
  updatedAt: string
}

export const BUG_LIMITS = { title: 120, body: 4000, reply: 1000, screenshots: 3, perDay: 5 }
