import { Armchair, LayoutDashboard, Map as MapIcon, RadioTower, Server, SlidersHorizontal, TrainFront, Waypoints } from '@lucide/vue'
import type { Component } from 'vue'

// The games the dashboard supports. Each has its own section of the site (/run8, /railroader)
// and only ever loads its own data. Add a game here, then add its pages under app/pages/<key>/.

export interface GameFeature {
  to: string
  label: string
  wordingKey?: string // when set, admins can rename this feature on the Appearance page
  icon: Component
  permission: string
  section?: GameSection // shown under this heading in the sidebar, with the features next to it that share it
}

export interface GameSection {
  label: string
  icon: Component
}

const DISPATCHING: GameSection = { label: 'Dispatching', icon: RadioTower }

export interface Game {
  key: GameKey
  name: string
  description: string
  features: GameFeature[] // what the sidebar lists while this game is chosen
}

export const GAMES: Game[] = [
  {
    key: 'run8',
    name: 'Run8',
    description: 'Run8 Train Simulator routes and servers',
    features: [{ to: '/run8', label: 'Route status', wordingKey: 'pageTitle', icon: Server, permission: 'status.view' }]
  },
  {
    key: 'railroader',
    name: 'Railroader',
    description: 'Railroader sessions and the railroad map',
    features: [
      { to: '/railroader', label: 'Overview', icon: LayoutDashboard, permission: 'overview.view' },
      { to: '/railroader/map', label: 'Map', icon: MapIcon, permission: 'map.view' },
      { to: '/railroader/ctc', label: 'CTC board', icon: Waypoints, permission: 'ctc.view', section: DISPATCHING },
      { to: '/railroader/desks', label: 'Desks', icon: Armchair, permission: 'ctc.view', section: DISPATCHING },
      { to: '/railroader/desks/edit', label: 'Edit desks', icon: SlidersHorizontal, permission: 'admin.lines', section: DISPATCHING },
      { to: '/railroader/status', label: 'Game status', icon: TrainFront, permission: 'status.view' }
    ]
  }
]

export const gameByKey = (key: GameKey) => GAMES.find((g) => g.key === key)!

// The features of a game this person's role can use.
export const visibleFeatures = (game: Game, permissions: string[] = []) =>
  game.features.filter((f) => permissions.includes(f.permission))

// Features as the sidebar lists them: on their own, or gathered under their section's heading.
export type SidebarEntry = { feature: GameFeature } | { section: GameSection; features: GameFeature[] }
export function sidebarEntries(features: GameFeature[]): SidebarEntry[] {
  const entries: SidebarEntry[] = []
  for (const feature of features) {
    const last = entries.at(-1)
    if (!feature.section) entries.push({ feature })
    else if (last && 'section' in last && last.section === feature.section) last.features.push(feature)
    else entries.push({ section: feature.section, features: [feature] })
  }
  return entries
}

// How a help article's game reads: a game's name, or "All games".
export const helpGameName = (game: HelpGame) => (game === 'all' ? 'All games' : gameByKey(game).name)
