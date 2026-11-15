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

// The game's positions are exact, but the map's curves are an approximation, so on a curve a train would sit
// beside the drawn line. This moves it onto the line at the same distance along the same piece of track.
export function placeOnTrack(map: MapData, train: LiveTrain): LiveTrain {
  const piece = train.track && trackIndex(map).segmentById.get(train.track.segment)
  if (piece === undefined || !train.track) return train

  const [a, b] = map.segments[piece]!
  const { length, at } = measureCurve(curveBetween(map, a, b))
  const fromA = train.track.end === 'A' ? train.track.distance : length - train.track.distance
  const { point, direction } = at(fromA)

  // The line runs from end A to end B; turn it round if the train is heading the other way.
  const rad = (train.heading * Math.PI) / 180
  const flip = direction[0] * Math.sin(rad) + direction[1] * Math.cos(rad) < 0 ? -1 : 1
  const heading = ((Math.atan2(direction[0] * flip, direction[1] * flip) * 180) / Math.PI + 360) % 360
  return { ...train, x: point[0], z: point[1], heading }
}

// "At Bryson Freight House" when it's on an industry's track, otherwise "Near <closest town>".
export function trainWhere(map: MapData, train: LiveTrain): string {
  const piece = train.track && trackIndex(map).segmentById.get(train.track.segment)
  const industry = piece === undefined ? undefined : trackIndex(map).industryBySegment.get(piece)
  if (industry) return `At ${industry.name}`
  const closest = map.areas.reduce((best, area) =>
    Math.hypot(area.x - train.x, area.z - train.z) < Math.hypot(best.x - train.x, best.z - train.z) ? area : best
  )
  return `Near ${closest.name}`
}
