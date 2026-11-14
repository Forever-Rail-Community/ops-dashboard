// Trains as the map shows them. A Railroader server sends them as the "trains" part of its report.

export interface TrainReport {
  id: string // the lead car's id, stable while the train exists
  name: string // the lead locomotive's reporting mark and number, e.g. "FR 101"
  x: number // world position of the lead end (same coordinates as the map)
  z: number
  heading: number // direction of travel in degrees, clockwise from north
  speedMph: number
  cars: number // cars in the train, locomotives included
}

export interface RailroaderTrains {
  trains: TrainReport[]
}

// A train as the dashboard sends it to the map: which server reported it is added.
export type LiveTrain = TrainReport & { agentId: string }

export interface TrainsResponse {
  trains: LiveTrain[]
  ageSec: number | null // how old the freshest report is; null when no server has reported trains
  stale: boolean
}
