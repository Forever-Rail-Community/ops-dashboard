// What's new: an update is a title and a list of changes, each in a part of the dashboard. Drafts are only seen by
// people who can post updates; published ones by everyone signed in.

export interface UpdateChange {
  area: string // which part of the dashboard, e.g. "Railroader map"
  text: string
}

export interface Update {
  id: number
  title: string
  changes: UpdateChange[]
  publishedAt: string | null // null while a draft
  updatedAt: string
  onDiscord: boolean // posted to the Discord channel
  roadmapItemIds: number[] // completed roadmap items it covers; publishing marks them as shipped in it
}

// The parts of the dashboard an update can be about; editors pick one per change.
export const UPDATE_AREAS = ['Railroader map', 'Railroader', 'Run8', 'Dashboard', 'Help center', 'Account and settings']

export const UPDATE_LIMITS = { title: 100, changes: 20, text: 300 }

// What publishing, saving or deleting did on Discord: done, not set up, or failed (the update itself still saved).
export type DiscordOutcome = 'posted' | 'updated' | 'removed' | 'off' | 'failed' | 'unchanged'
