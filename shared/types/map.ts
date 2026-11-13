export type IndustryKind = 'passenger' | 'interchange' | 'loads' | 'unloads' | 'repair' | 'team'

export interface MapArea {
  id: string
  name: string
  x: number
  z: number
  r: number
}

export interface MapIndustry {
  id: string
  name: string
  area: string
  x: number
  z: number
  kinds: IndustryKind[]
}

export interface MapTurntable {
  id: string
  x: number
  z: number
  r: number
  bridge: [number, number, number, number] // x1, z1, x2, z2: the two ends of the bridge across the pit
}

// Coordinates are the game's own: x runs east, z runs north. Nodes are [x, z, yaw]: yaw is the track's heading through the node, in degrees clockwise from north.
// Segments are [nodeIndexA, nodeIndexB, speedLimit (0 = none set)].
export interface MapData {
  version: number
  bounds: [number, number, number, number]
  nodes: [number, number, number][]
  segments: [number, number, number][]
  switches: number[]
  areas: MapArea[]
  industries: MapIndustry[]
  turntables: MapTurntable[]
}

// Which parts of the map are drawn.
export interface MapLayers {
  speed: boolean
  switches: boolean
  places: boolean
  industries: boolean
  stops: boolean
  turntables: boolean
}

// What the person is looking at and where it is. Pan/zoom state lives with the viewport size so one object describes the camera.
export interface MapViewState {
  cx: number // world position at the center of the screen
  cz: number
  s: number // pixels per world unit
  w: number // canvas size in CSS pixels
  h: number
  fit: number // the scale that shows the whole railroad
}

// Something on the map that can be hovered, selected or searched for.
export interface MapHit {
  type: 'place' | 'industry' | 'switch' | 'track'
  id: string
  name: string
  x: number
  z: number
  speed?: number // track only
}
