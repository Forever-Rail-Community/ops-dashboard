// What's running right now, for the sign-in page's live background (GET /api/public/pulse). Public, so it holds only
// what anyone in the community could see in game: locomotive numbers, speeds, car counts, the nearest town and
// named signals. No player names and no map data. Admins can turn it off in Admin > Appearance.

// Where something is: its place on the railroad drawing (percent from the drawing's left and top), and the town.
export interface PulsePlace {
  left: number
  top: number
  near: string
}

export interface PulseGame {
  game: GameKey
  name: string
  up: boolean
  detail: string // e.g. "3 routes running", or the loaded railroad
}

export interface PulseTrain extends PulsePlace {
  id: string
  name: string
  speedMph: number
  cars: number
}

// A named place's signals, as one: its most open aspect (several signals can share a name, one per track).
export interface PulseSignal extends PulsePlace {
  id: string // the name
  name: string
  aspect: SignalAspect
}

export interface Pulse {
  games: PulseGame[]
  trains: PulseTrain[] // Railroader only; Run8 doesn't report trains
  signals: PulseSignal[] // named (absolute) signals only, one per name
}
