// Finding what is under the pointer.

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const POINT_RADIUS = 14 // pixels around a town or industry that count as pointing at it
const TRACK_RADIUS = 7

export function hitAt(px: number, py: number, map: MapData, view: MapViewState, layers: MapLayers): MapHit | null {
  const p = projector(view)
  let best: MapHit | null = null
  let bestDist = POINT_RADIUS

  const consider = (hit: MapHit) => {
    const d = Math.hypot(px - p.x(hit.x), py - p.y(hit.z))
    if (d < bestDist) {
      bestDist = d
      best = hit
    }
  }
  if (layers.places) map.areas.forEach((a) => consider(placeHit(a)))
  map.industries.filter((i) => industryVisible(i, layers)).forEach((i) => consider(industryHit(i)))
  if (best) return best

  let trackDist = TRACK_RADIUS
  for (const [a, b, speed] of map.segments) {
    const [ax, az] = map.nodes[a]!
    const [bx, bz] = map.nodes[b]!
    const d = distToSegment(px, py, p.x(ax), p.y(az), p.x(bx), p.y(bz))
    if (d < trackDist) {
      trackDist = d
      best = { type: 'track', id: `${a}-${b}`, name: 'Track', x: p.worldX(px), z: p.worldZ(py), speed }
    }
  }
  return best
}
