// The Railroader Overview, for members (GET /api/railroader/overview): whether the railroad is running, how to join,
// and the trains out on it. Only what a member may see; process details stay on the staff Game status page.

export interface OverviewRailroad {
  online: boolean // the game is running a session and its server is reporting
  upSec: number | null // how long the game has been running
  name: string | null // the loaded railroad's name
  gameVersion: string | null // the server's Railroader version, which players need to match
  // The join code, for people allowed to see it: null when the railroad isn't open to multiplayer, left out when
  // they aren't allowed or the Signals mod isn't reporting it.
  joinCode?: string | null
}

export interface OverviewTrain {
  id: string
  name: string // the lead locomotive's reporting mark and number
  speedMph: number
  near: string // the nearest named place
}

export interface RailroaderOverview {
  railroad: OverviewRailroad | null // null when no Railroader server has reported recently
  trains: OverviewTrain[]
}
