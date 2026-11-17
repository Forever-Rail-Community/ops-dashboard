// Live trains on the map: placed on the track as drawn, and described by where they are.

interface TrackIndex {
  segmentById: Map<string, number>
  industryBySegment: Map<number, MapIndustry> // the most specific industry whose track includes the piece
}

const indexes = new WeakMap<MapData, TrackIndex>()

function trackIndex(map: MapData): TrackIndex {
  let index = indexes.get(map)
  if (!index) {
    const industryBySegment = new Map<number, MapIndustry>()
    // Smallest track lists first, so a piece shared by a big and a small industry is named after the small one.
    for (const industry of [...map.industries].sort((a, b) => a.track.length - b.track.length)) {
      for (const piece of industry.track) if (!industryBySegment.has(piece)) industryBySegment.set(piece, industry)
    }
    index = { segmentById: new Map(map.segmentIds.map((id, i) => [id, i])), industryBySegment }
    indexes.set(map, index)
  }
  return index
}

// The map's index for a piece of track, by the game's id for it.
export const pieceById = (map: MapData, id: string) => trackIndex(map).segmentById.get(id)
// The map's index for the piece of track the train's lead end is on.
export const pieceOf = (map: MapData, train: LiveTrain) => (train.track ? pieceById(map, train.track.segment) : undefined)

// Where a place the game reports is on the map's drawn track: the piece, meters from its end A, the point and the
// direction of the line there (from A toward B), and whether `heading` (degrees clockwise from north) points
// toward end B. Undefined when the piece isn't in the map data.
export function trackPosition(map: MapData, location: TrackLocation, heading: number) {
  const piece = pieceById(map, location.segment)
  if (piece === undefined) return undefined
  const [a, b] = map.segments[piece]!
  const { length, at } = measureCurve(curveBetween(map, a, b))
  const fromA = Math.min(length, Math.max(0, location.end === 'A' ? location.distance : length - location.distance))
  const { point, direction } = at(fromA)
  const rad = (heading * Math.PI) / 180
  const towardB = direction[0] * Math.sin(rad) + direction[1] * Math.cos(rad) >= 0
  return { piece, length, fromA, point, direction, towardB }
}

// The game's positions are exact, but the map's curves are an approximation, so on a curve a train would sit
// beside the drawn line. This moves it onto the line at the same distance along the same piece of track.
export function placeOnTrack(map: MapData, train: LiveTrain): LiveTrain {
  const at = train.track && trackPosition(map, train.track, train.heading)
  if (!at) return train
  const flip = at.towardB ? 1 : -1
  const heading = ((Math.atan2(at.direction[0] * flip, at.direction[1] * flip) * 180) / Math.PI + 360) % 360
  return { ...train, x: at.point[0], z: at.point[1], heading }
}

// "At Bryson Freight House" when it's on an industry's track, otherwise "Near <closest town>".
// The industry whose track the train's lead end is on (the most specific one, where tracks are shared).
export function trainIndustry(map: MapData, train: LiveTrain): MapIndustry | undefined {
  const piece = pieceOf(map, train)
  return piece === undefined ? undefined : trackIndex(map).industryBySegment.get(piece)
}

export function trainWhere(map: MapData, train: LiveTrain): string {
  const industry = trainIndustry(map, train)
  if (industry) return `At ${industry.name}`
  const closest = map.areas.reduce((best, area) =>
    Math.hypot(area.x - train.x, area.z - train.z) < Math.hypot(best.x - train.x, best.z - train.z) ? area : best
  )
  return `Near ${closest.name}`
}

// The posted speed limit where the train's lead end is, or undefined when the map data sets none there.
export function trainSpeedLimit(map: MapData, train: LiveTrain): number | undefined {
  const piece = pieceOf(map, train)
  const limit = piece === undefined ? 0 : map.segments[piece]![2]
  return limit || undefined
}
