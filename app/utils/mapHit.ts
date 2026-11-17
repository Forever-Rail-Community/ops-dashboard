// Finding what is under the pointer. Every visible thing is measured against the shape it's drawn as, so a click
// lands on what is actually there:
// - a train's tag always wins: it's drawn over everything;
// - on a marker (train, town, industry, signal, switch): that marker. Where markers overlap, the one the pointer is
//   most squarely on (nearest its middle, for its size), so the edge of a neighbor never steals the click; if
//   that's even, the one drawn on top;
// - near markers but on none: the nearest, within SLACK pixels;
// - otherwise the track under or near the pointer, which sits beneath everything.

const SLACK = 4 // pixels of forgiveness around a drawn shape
const BARE_SWITCH_RADIUS = 5 // a switch shown only by its faint leg has no ring; this much around its point counts

// Top to bottom, as drawn (mapDraw.ts): the order that settles overlaps.
const LAYER = { train: 0, place: 1, industry: 2, signal: 3, switch: 4 } as const

interface Candidate {
  hit: MapHit
  distance: number // pixels from the pointer to the drawn shape; 0 or less when on it
  size: number // the shape's half-thickness (a round marker's radius), to compare how far inside overlapping shapes it is
  layer: number
}

type Projector = ReturnType<typeof projector>

// A round marker: its distance is to its edge.
const round = (hit: MapHit, radius: number, p: Projector, px: number, py: number, layer: number): Candidate => ({
  hit,
  distance: Math.hypot(px - p.x(hit.x), py - p.y(hit.z)) - radius,
  size: radius,
  layer
})

function nearestTrack(px: number, py: number, map: MapData, view: MapViewState, p: Projector): MapHit | null {
  const half = trackHalfWidth(view)
  let best: MapHit | null = null
  let bestDistance = SLACK
  for (const [a, b, speed] of map.segments) {
    const line = flatten(curveBetween(map, a, b)).map(([x, z]) => [p.x(x), p.y(z)] as const)
    for (let i = 1; i < line.length; i++) {
      const distance = distToSegment(px, py, line[i - 1]![0], line[i - 1]![1], line[i]![0], line[i]![1]) - half
      if (distance <= bestDistance) {
        bestDistance = distance
        best = { type: 'track', id: `${a}-${b}`, name: 'Track', x: p.worldX(px), z: p.worldZ(py), speed }
      }
    }
  }
  return best
}

// `ctx` is only used to measure text, so train tags are laid out exactly as drawn.
export function hitAt(px: number, py: number, map: MapData, view: MapViewState, layers: MapLayers, live: LiveMapData, ctx: CanvasRenderingContext2D): MapHit | null {
  const p = projector(view)
  const candidates: Candidate[] = []

  if (layers.trains) {
    const tag = tagAt(layoutTrainTags(ctx, live.trains, p, view.w, view.h), px, py)
    if (tag) return trainHit(tag.train)
    for (const train of live.trains) candidates.push(round(trainHit(train), SYMBOL_RADIUS.trainMoving, p, px, py, LAYER.train))
  }
  if (layers.places) {
    for (const area of map.areas) candidates.push(round(placeHit(area), SYMBOL_RADIUS.place, p, px, py, LAYER.place))
  }
  for (const industry of map.industries) {
    if (!industryVisible(industry, layers)) continue
    const radius = SYMBOL_RADIUS[isPassengerStop(industry) ? 'stop' : 'industry']
    candidates.push(round(industryHit(industry), radius, p, px, py, LAYER.industry))
  }
  if (signalsVisible(view, layers) && live.signals.layout) {
    for (const signal of live.signals.layout.signals) {
      candidates.push({ hit: signalHit(signal), ...signalShapeDistance(signalPose(signal, p), px, py), layer: LAYER.signal })
    }
  }
  if (switchesVisible(view, layers)) {
    // Same rule as drawing: a switch that shows which way it's lined on the track has no ring.
    const unlined = unlinedPieces(map, live.switchLegs, live.switches)
    const ring = SYMBOL_RADIUS.switch * switchRingScale(view)
    map.switches.forEach((node, k) => {
      const id = map.switchIds[k]!
      const [x, z] = map.nodes[node]!
      candidates.push(round(switchHit(id, x, z), unlined.has(id) ? BARE_SWITCH_RADIUS : ring, p, px, py, LAYER.switch))
    })
  }
  return pick(candidates) ?? nearestTrack(px, py, map, view, p)
}

function pick(candidates: Candidate[]): MapHit | null {
  // On a marker: the deepest inside, for its size (1 at its middle); a tie goes to the one drawn on top.
  const depth = (c: Candidate) => -c.distance / c.size
  const on = candidates.filter((c) => c.distance <= 0)
  if (on.length) {
    return on.reduce((best, c) => (depth(c) > depth(best) || (depth(c) === depth(best) && c.layer < best.layer) ? c : best)).hit
  }
  // Near markers: the nearest edge within SLACK; a tie goes to the one drawn on top.
  let best: Candidate | null = null
  for (const c of candidates) {
    if (c.distance > SLACK) continue
    if (!best || c.distance < best.distance || (c.distance === best.distance && c.layer < best.layer)) best = c
  }
  return best?.hit ?? null
}
