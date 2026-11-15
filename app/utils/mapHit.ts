// Finding what is under the pointer. Trains (and their tags) win over towns and industries, those over switches,
// and switches over plain track.

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
const nearest = (hits: MapHit[], px: number, py: number, p: Projector, radius: number) =>
  nearestBy(hits, (hit) => ({ x: p.x(hit.x), y: p.y(hit.z) }), px, py, radius)

// The item drawn closest to the pointer, within `radius` pixels, given where each is drawn on screen.
function nearestBy<T>(items: T[], at: (item: T) => { x: number; y: number }, px: number, py: number, radius: number): T | null {
  let best: T | null = null
  let bestDist = radius
  for (const item of items) {
    const { x, y } = at(item)
    const d = Math.hypot(px - x, py - y)
    if (d < bestDist) {
      bestDist = d
      best = item
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

// `ctx` is only used to measure text, so train tags are laid out exactly as drawn.
export function hitAt(px: number, py: number, map: MapData, view: MapViewState, layers: MapLayers, live: LiveMapData, ctx: CanvasRenderingContext2D): MapHit | null {
  const { trains } = live
  const p = projector(view)

  if (layers.trains) {
    const tag = tagAt(layoutTrainTags(ctx, trains, p, view.w, view.h), px, py)
    if (tag) return trainHit(tag.train)
    const train = nearest(trains.map(trainHit), px, py, p, POINT_RADIUS)
    if (train) return train
  }

  const places = layers.places ? map.areas.map(placeHit) : []
  const industries = map.industries.filter((i) => industryVisible(i, layers)).map(industryHit)
  const point = nearest([...places, ...industries], px, py, p, POINT_RADIUS)
  if (point) return point

  if (signalsVisible(view, layers) && live.signals.layout) {
    const near = nearestBy(live.signals.layout.signals, (s) => signalLamp(signalPose(s, p)), px, py, SWITCH_RADIUS)
    if (near) return signalHit(near)
  }

  if (switchesVisible(view, layers)) {
    const switches = map.switches.map((node, k) => switchHit(map.switchIds[k]!, map.nodes[node]![0], map.nodes[node]![1]))
    const found = nearest(switches, px, py, p, SWITCH_RADIUS)
    if (found) return found
  }
  return trackAt(px, py, map, p)
}
