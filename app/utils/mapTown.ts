// Facts about a town for its card: its industries in the order they sit along the track, and the trains in it.

// Track points joined by pieces of track, with each piece's length (straight-line, which is close enough here).
const graphs = new WeakMap<MapData, Map<number, [number, number][]>>()

function trackGraph(map: MapData) {
  let graph = graphs.get(map)
  if (!graph) {
    graph = new Map()
    for (const [a, b] of map.segments) {
      const length = Math.hypot(map.nodes[a]![0] - map.nodes[b]![0], map.nodes[a]![1] - map.nodes[b]![1])
      graph.set(a, [...(graph.get(a) ?? []), [b, length]])
      graph.set(b, [...(graph.get(b) ?? []), [a, length]])
    }
    graphs.set(map, graph)
  }
  return graph
}

// Distance along the track from `start` to every track point, stopping past `limit` meters.
function distancesFrom(map: MapData, start: number, limit: number) {
  const graph = trackGraph(map)
  const best = new Map<number, number>([[start, 0]])
  const queue: [number, number][] = [[0, start]]
  while (queue.length) {
    queue.sort((x, y) => x[0] - y[0])
    const [d, node] = queue.shift()!
    if (d > (best.get(node) ?? Infinity) || d > limit) continue
    for (const [next, length] of graph.get(node) ?? []) {
      const nd = d + length
      if (nd < (best.get(next) ?? Infinity)) {
        best.set(next, nd)
        queue.push([nd, next])
      }
    }
  }
  return best
}

export interface TownStop {
  industry: MapIndustry
  distance: number | null // meters along the track from the first industry; null if it couldn't be measured
}

export interface TownOrder {
  stops: TownStop[]
  from: string | null // the neighboring town the order starts from ("from the Alarka Jct end")
}

const orders = new WeakMap<MapData, Map<string, TownOrder>>()

// The town's industries in track order. The order starts at the end of town nearest the closest other town, and
// is measured along the track (a train can't reverse at a switch, which this ignores, so distances are approximate).
export function townOrder(map: MapData, area: MapArea): TownOrder {
  let cache = orders.get(map)
  if (!cache) orders.set(map, (cache = new Map()))
  const cached = cache.get(area.id)
  if (cached) return cached

  const industries = map.industries.filter((i) => i.area === area.id)
  const nodesOf = (industry: MapIndustry) => industry.track.flatMap((piece) => map.segments[piece]!.slice(0, 2))
  const allNodes = industries.flatMap(nodesOf)
  const neighbor = map.areas
    .filter((a) => a.id !== area.id)
    .reduce<MapArea | null>((best, a) => (!best || Math.hypot(a.x - area.x, a.z - area.z) < Math.hypot(best.x - area.x, best.z - area.z) ? a : best), null)

  let order: TownOrder
  if (!allNodes.length || !neighbor) {
    order = { stops: industries.map((industry) => ({ industry, distance: null })), from: null }
  } else {
    const start = allNodes.reduce((best, n) =>
      Math.hypot(map.nodes[n]![0] - neighbor.x, map.nodes[n]![1] - neighbor.z) < Math.hypot(map.nodes[best]![0] - neighbor.x, map.nodes[best]![1] - neighbor.z) ? n : best
    )
    const distances = distancesFrom(map, start, area.r * 4)
    const measured = industries.map((industry) => {
      const ds = nodesOf(industry).map((n) => distances.get(n)).filter((d): d is number => d !== undefined)
      return { industry, distance: ds.length ? Math.min(...ds) : null }
    })
    measured.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    const first = measured.find((m) => m.distance !== null)?.distance ?? 0
    order = { stops: measured.map((m) => ({ ...m, distance: m.distance === null ? null : m.distance - first })), from: neighbor.name }
  }
  cache.set(area.id, order)
  return order
}

// Trains on one of the town's industry tracks, or within the town's radius.
export function trainsInTown(map: MapData, area: MapArea, trains: LiveTrain[]) {
  return trains.filter((t) => trainIndustry(map, t)?.area === area.id || Math.hypot(t.x - area.x, t.z - area.z) <= area.r)
}

// Trains whose lead end is on one of the industry's pieces of track.
export function trainsAtIndustry(map: MapData, industry: MapIndustry, trains: LiveTrain[]) {
  return trains.filter((t) => {
    const piece = pieceOf(map, t)
    return piece !== undefined && industry.track.includes(piece)
  })
}

// "120 m" or "1.4 km".

// Where to look to see an industry: the middle of its track, and how much ground to show (at least 150 m).
const MIN_FRAME_METERS = 150
export function industryFrame(map: MapData, industry: MapIndustry) {
  const nodes = industry.track.flatMap((piece) => map.segments[piece]!.slice(0, 2)).map((n) => map.nodes[n]!)
  if (!nodes.length) return { x: industry.x, z: industry.z, meters: MIN_FRAME_METERS }
  const xs = nodes.map((n) => n[0])
  const zs = nodes.map((n) => n[1])
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, meters: Math.max(MIN_FRAME_METERS, x1 - x0, z1 - z0) }
}
