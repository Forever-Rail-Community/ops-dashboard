// A CTC line: the towns along one route in order, worked out from the game's own layout (shared/utils/ctcLine.ts)
// and saved so staff can name it and correct what the game can't say.

export interface CtcTown {
  name: string // shown on the board; starts as the game's name less "East"/"West"
  controlPoints: string[] // in board order, left to right: one, or two (the ends of a passing siding)
  main: string[] // block ids, from the left control point to the right
  sidings: string[][] // each as block ids, left to right
  deadEnds: { from: string; via: string[] }[] // track that ends off a control point (connecting tracks, spurs)
  // Whether the game's data settled which track is the main (each switch's normal leg). When false, check it.
  mainCertain: boolean
  milepost?: number // set by staff; otherwise the board shows the distance measured along the track
}

// The blocks between one town's control point and the next town's, in order.
export interface CtcLink {
  from: string
  to: string
  via: string[]
}

export interface CtcLineData {
  towns: CtcTown[]
  links: CtcLink[] // links[i] joins towns[i] and towns[i + 1]
}

export interface CtcLine extends CtcLineData {
  id: string
  name: string
  updatedAt: string
  updatedBy: string
}
