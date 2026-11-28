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

// A CTC control point, as the game groups it: the switches it throws, its switch block and its signals. From host
// mod 0.7.0 on.
export interface ControlPointDef {
  id: string
  name: string // the game's name, e.g. "Whittier West"
  switches: string[]
  blocks: string[]
  signals: string[]
}

// The "signallayout" report: where things are. Changes only when track or signals are built.
export interface RailroaderSignalLayout {
  signals: SignalDef[]
  blocks: BlockDef[]
  // By the game's switch id: its [normal, reverse] piece of track, by the game's piece id. Empty from signals
  // mods before 0.2.
  switchLegs: Record<string, [string, string]>
  // Empty from agents before 0.15 or host mods before 0.7.0.
  controlPoints: ControlPointDef[]
}

// The "signals" report: what they show right now.
export interface RailroaderSignals {
  aspects: Record<string, SignalAspect> // by signal id
  occupied: Record<string, boolean> // by block id
  // By switch id: released for hand throwing (Unlock Switch on the stand, or the dispatcher's release). The game holds
  // the control point's switch block occupied while one is. Host mod 0.12.0 and later; empty before.
  released: Record<string, boolean>
}
