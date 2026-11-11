// Lookups the map components share.

export function useMapIndex(map: MapData) {
  const areaById = new Map(map.areas.map((a) => [a.id, a]))
  const industryById = new Map(map.industries.map((i) => [i.id, i]))
  const industriesIn = (areaId: string) => map.industries.filter((i) => i.area === areaId)
  return { areaById, industryById, industriesIn }
}
