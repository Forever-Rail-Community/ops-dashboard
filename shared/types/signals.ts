// Railroader CTC signals and blocks, from the Forever Rail Signals mod on a Railroader server.

export type SignalAspect = 'stop' | 'approach' | 'clear' | 'divergingApproach' | 'divergingClear' | 'restricting' | 'unknown'
export const SIGNAL_ASPECTS: SignalAspect[] = ['stop', 'approach', 'clear', 'divergingApproach', 'divergingClear', 'restricting', 'unknown']

export interface SignalDef {
  id: string
  x: number // where it stands, in the map's coordinates
  z: number
  dx: number // the way it faces (the trains it governs travel this way); 0, 0 when the game doesn't say
  dz: number
  name: string // empty for intermediate signals, which the game doesn't name
  intermediate?: boolean // absolute (false) or intermediate (true); missing from signals mods before 0.3.0
}

export interface BlockDef {
  id: string
  track: [number, number][][] // the block's track: one list of points (x, z) per piece of track
}

// The "signallayout" report: where things are. Changes only when track or signals are built.
export interface RailroaderSignalLayout {
  signals: SignalDef[]
  blocks: BlockDef[]
  // By the game's switch id: its [normal, reverse] piece of track, by the game's piece id. Empty from signals
  // mods before 0.2.
  switchLegs: Record<string, [string, string]>
}

// The "signals" report: what they show right now.
export interface RailroaderSignals {
  aspects: Record<string, SignalAspect> // by signal id
  occupied: Record<string, boolean> // by block id
}
