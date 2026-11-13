// Finding what is under the pointer. Towns and industries win over switches, and switches win over plain track.

const POINT_RADIUS = 14 // pixels around a town or industry that count as pointing at it
const SWITCH_RADIUS = 9
const TRACK_RADIUS = 7

type Projector = ReturnType<typeof projector>

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// The closest hit within `radius` pixels of the pointer.
function nearest(hits: MapHit[], px: number, py: number, p: Projector, radius: number): MapHit | null {
  let best: MapHit | null = null
  let bestDist = radius
  for (const hit of hits) {
    const d = Math.hypot(px - p.x(hit.x), py - p.y(hit.z))
    if (d < bestDist) {
      bestDist = d
      best = hit
    }
  }
  return best
}

function trackAt(px: number, py: number, map: MapData, p: Projector): MapHit | null {
  let best: MapHit | null = null
  let bestDist = TRACK_RADIUS
  for (const [a, b, speed] of map.segments) {
    const line = flatten(curveBetween(map, a, b)).map(([x, z]) => [p.x(x), p.y(z)] as const)
    for (let i = 1; i < line.length; i++) {
      const d = distToSegment(px, py, line[i - 1]![0], line[i - 1]![1], line[i]![0], line[i]![1])
      if (d < bestDist) {
        bestDist = d
        best = { type: 'track', id: `${a}-${b}`, name: 'Track', x: p.worldX(px), z: p.worldZ(py), speed }
      }
    }
  }
  return best
}

export function hitAt(px: number, py: number, map: MapData, view: MapViewState, layers: MapLayers): MapHit | null {
  const p = projector(view)

  const places = layers.places ? map.areas.map(placeHit) : []
  const industries = map.industries.filter((i) => industryVisible(i, layers)).map(industryHit)
  const point = nearest([...places, ...industries], px, py, p, POINT_RADIUS)
  if (point) return point

  if (switchesVisible(view, layers)) {
    const switches = map.switches.map((i) => switchHit(i, map.nodes[i]![0], map.nodes[i]![1]))
    const found = nearest(switches, px, py, p, SWITCH_RADIUS)
    if (found) return found
  }
  return trackAt(px, py, map, p)
}
