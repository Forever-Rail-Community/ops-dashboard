// What moves on the Railroader map. A Railroader server sends it as the "trains" and "switches" parts of its report.

// A place on the track as the game gives it: a track piece, which end the distance is measured from, and meters.
export interface TrackLocation {
  segment: string // the game's id for the piece, e.g. "S63c" (the same ids as the map data)
  end: 'A' | 'B'
  distance: number
}

export interface TrainReport {
  id: string // its lowest locomotive id, stable while those locomotives stay together
  name: string // the lead locomotive's reporting mark and number, e.g. "VSR 6000"
  x: number // world position of the lead end (same coordinates as the map)
  z: number
  heading: number // direction of travel in degrees, clockwise from north
  speedMph: number
  cars: number // cars in the train, locomotives included
  track?: TrackLocation // where the lead end is on the track, so the map can put it on the drawn line
}

export interface RailroaderTrains {
  trains: TrainReport[]
}

// Switch positions by the game's switch id: true = thrown (diverging), false = normal (lined straight).
// Switches the game couldn't read are left out.
export interface RailroaderSwitches {
  thrown: Record<string, boolean>
}

// A train as the dashboard sends it to the map: which server reported it is added.
export type LiveTrain = TrainReport & { agentId: string }

export interface ReportAge {
  ageSec: number | null // how old the freshest report is; null when no server has sent one
  stale: boolean
}

export interface LiveResponse {
  trains: LiveTrain[]
  trainsAge: ReportAge
  switches: Record<string, boolean>
  switchesAge: ReportAge
}
