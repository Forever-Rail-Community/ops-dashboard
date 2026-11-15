// What is at each Railroader industry right now: the "industries" part of a Railroader server's report.

export interface CarLoad {
  name: string // the game's name for the load, e.g. "Coal"
  quantity: number // in the game's own units for that load
}

export interface CarAtIndustry {
  id: string
  name: string // reporting mark and number, e.g. "ALW 600"
  type: string // AAR car type code, e.g. "XM"
  loads: CarLoad[]
  waybill: { destination: string; completed: boolean } | null // destination: "<industry id>.<part>" or an industry id
}

export interface StopPassengers {
  stop: string // the game's passenger stop id, e.g. "alarka"
  waiting: Record<string, number> // passengers waiting, by destination stop id
}

export interface RailroaderIndustries {
  cars: Record<string, CarAtIndustry[]> // by industry id; industries with no cars are left out
  passengers: Record<string, StopPassengers> // by the industry id of the stop
}
