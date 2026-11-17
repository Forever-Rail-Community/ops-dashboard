import { Map as MapIcon, Server, TrainFront } from '@lucide/vue'
import type { Component } from 'vue'

// The games the dashboard supports. Each has its own section of the site (/run8, /railroader)
// and only ever loads its own data. Add a game here, then add its pages under app/pages/<key>/.

export interface GameFeature {
  to: string
  label: string
  wordingKey?: string // when set, admins can rename this feature on the Appearance page
  icon: Component
  permission: string
}

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
      { to: '/railroader', label: 'Game status', icon: TrainFront, permission: 'status.view' },
      { to: '/railroader/map', label: 'Map', icon: MapIcon, permission: 'map.view' }
    ]
  }
]

export const gameByKey = (key: GameKey) => GAMES.find((g) => g.key === key)!

// The features of a game this person's role can use.
export const visibleFeatures = (game: Game, permissions: string[] = []) =>
  game.features.filter((f) => permissions.includes(f.permission))

// How a help article's game reads: a game's name, or "All games".
export const helpGameName = (game: HelpGame) => (game === 'all' ? 'All games' : gameByKey(game).name)
