// Places on the Railroader map, for describing where something is in words.

// The nearest named place (town or junction) to a point in the map's coordinates.
export function nearestTown(map: MapData, x: number, z: number) {
  const dist = (area: MapArea) => Math.hypot(area.x - x, area.z - z)
  return map.areas.reduce<MapArea | undefined>((best, area) => (!best || dist(area) < dist(best) ? area : best), undefined)?.name ?? 'the railroad'
}
