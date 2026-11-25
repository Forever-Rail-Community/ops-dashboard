// Works out CTC lines from the game's own layout: which control points make up a town, the town's main and
// sidings, the blocks between towns, and the order of towns along each line. Nothing is typed in by hand; staff
// name the line and can correct the rest (see CtcTown). Tested on the Murphy Branch: 18 towns, every main matching
// the game's own block names, which this doesn't use.

type Point = [number, number]

const near = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
const key = ([x, z]: Point) => `${Math.round(x)},${Math.round(z)}`
const SIDES = /\s+(East|West|North|South)$/
const MAX_VIA = 8 // blocks between two control points; longer runs are left out
const ATTACH_WITHIN = 300 // meters: how near a dead end a track-less control point's signals must stand

interface Route {
  from: string
  to: string
  via: string[]
}

// One line per separate piece of signalled railroad (two servers on different routes give two lines), longest
// first. `map` is the map data, for where each switch's normal leg runs.
export function deriveLines(layout: RailroaderSignalLayout, map: MapData): CtcLineData[] {
  const blocks = new Map(layout.blocks.map((b) => [b.id, b]))
  const signals = new Map(layout.signals.map((s) => [s.id, s]))
  const cps = layout.controlPoints
  const cpById = new Map(cps.map((c) => [c.id, c]))
  const cpOfBlock = new Map<string, string>()
  for (const cp of cps) for (const b of cp.blocks) if (blocks.get(b)?.track.length) cpOfBlock.set(b, cp.id)

  const points = (id: string) => blocks.get(id)?.track.flat() ?? []
  const distTo = (id: string, p: Point) => Math.min(Infinity, ...points(id).map((q) => near(q, p)))
  const endsOf = (id: string) => (blocks.get(id)?.track ?? []).flatMap((piece) => [piece[0]!, piece.at(-1)!])
  const center = (cpId: string): Point | null => {
    const pts = (cpById.get(cpId)?.signals ?? []).map((id) => signals.get(id)).filter((s) => !!s)
    return pts.length ? [pts.reduce((a, p) => a + p.x, 0) / pts.length, pts.reduce((a, p) => a + p.z, 0) / pts.length] : null
  }

  // Blocks touch where their pieces end at the same point. Where a control point's block is among them, track runs
  // through the control point, so the others aren't linked directly (the game's control point blocks overlap their
  // neighbors a little).
  const atPoint = new Map<string, Set<string>>()
  for (const b of layout.blocks) for (const p of endsOf(b.id)) {
    const k = key(p)
    if (!atPoint.has(k)) atPoint.set(k, new Set())
    atPoint.get(k)!.add(b.id)
  }
  const adj = new Map(layout.blocks.map((b) => [b.id, new Set<string>()]))
  for (const set of atPoint.values()) {
    const ids = [...set]
    const viaCp = ids.some((id) => cpOfBlock.has(id))
    for (const a of ids) for (const b of ids) if (a !== b && (!viaCp || cpOfBlock.has(a) || cpOfBlock.has(b))) adj.get(a)!.add(b)
  }

  // Every route from a control point through ordinary blocks to the next control point.
  const routes: Route[] = []
  for (const cp of cps) for (const start of cp.blocks) {
    if (!cpOfBlock.has(start)) continue
    const walk = (block: string, via: string[]) => {
      for (const next of adj.get(block) ?? []) {
        if (via.includes(next)) continue
        const other = cpOfBlock.get(next)
        if (other) {
          if (other !== cp.id && via.length) routes.push({ from: cp.id, to: other, via })
          continue
        }
        if (via.length < MAX_VIA) walk(next, [...via, next])
      }
    }
    walk(start, [])
  }

  // Towns: control points named "<town> East" and "<town> West" (or North/South) share a town; any other is its own.
  const townOf = new Map(cps.map((cp) => [cp.id, cp.name.replace(SIDES, '') || cp.id]))
  const between = routes.filter((r) => townOf.get(r.from) !== townOf.get(r.to))
  const betweenBlocks = new Set(between.flatMap((r) => r.via))

  // Where each switch's normal leg runs: the end of the leg away from the points, clear of the other leg.
  const segmentIndex = new Map(map.segmentIds.map((id, i) => [id, i]))
  const switchNode = new Map(map.switchIds.map((id, k) => [id, map.switches[k]]))
  const normalLegEnd = (switchId: string): Point | null => {
    const legs = layout.switchLegs[switchId]
    const seg = legs && map.segments[segmentIndex.get(legs[0]) ?? -1]
    if (!seg) return null
    const node = map.nodes[seg[0] === switchNode.get(switchId) ? seg[1] : seg[0]]
    return node ? [node[0], node[1]] : null
  }

  const towns = new Map<string, CtcTown>()
  for (const name of new Set(townOf.values())) {
    const members = cps.filter((cp) => townOf.get(cp.id) === name).map((cp) => cp.id)
    // The town's own tracks: routes between its control points through blocks that lead nowhere else.
    const own = routes.filter((r) => townOf.get(r.from) === name && townOf.get(r.to) === name && r.via.every((b) => !betweenBlocks.has(b)))
    const candidates = new Set(own.flatMap((r) => r.via))
    for (let changed = true; changed; ) {
      changed = false
      for (const b of candidates) {
        if ([...adj.get(b)!].some((n) => !cpOfBlock.has(n) && !candidates.has(n))) {
          candidates.delete(b)
          changed = true
        }
      }
    }
    const seen = new Set<string>()
    const tracks = own
      .filter((r) => r.via.every((b) => candidates.has(b)))
      .map((r) => (r.from < r.to ? r.via : [...r.via].reverse()))
      .filter((via) => !seen.has(via.join()) && !!seen.add(via.join()))
      // A route that skips part of a longer track (Bryson's main is three blocks) isn't a track of its own.
      .filter((via, _, all) => !all.some((o) => o !== via && o.length > via.length && via.every((b) => o.includes(b))))
    // The main is the track the town's switches line in normal position: each normal leg votes for the track it
    // runs onto.
    const votes = tracks.map(() => 0)
    for (const cpId of members) for (const sw of cpById.get(cpId)!.switches) {
      const leg = normalLegEnd(sw)
      if (!leg) continue
      const d = tracks.map((via) => Math.min(...via.map((b) => distTo(b, leg))))
      votes[d.indexOf(Math.min(...d))]!++
    }
    const ranked = tracks.map((via, i) => ({ via, votes: votes[i]! })).sort((a, b) => b.votes - a.votes)
    towns.set(name, {
      name,
      controlPoints: members,
      main: ranked[0]?.via ?? [],
      sidings: ranked.slice(1).map((r) => r.via),
      deadEnds: [],
      mainCertain: ranked.length < 2 || ranked[0]!.votes > ranked[1]!.votes
    })
  }

  // Track that ends without reaching another control point, by the control point it leaves.
  const onTownTrack = (id: string) => [...towns.values()].some((t) => [t.main, ...t.sidings].some((via) => via.includes(id)))
  for (const cp of cps) for (const start of cp.blocks) {
    if (!cpOfBlock.has(start)) continue
    for (const n of adj.get(start)!) {
      if (cpOfBlock.has(n) || betweenBlocks.has(n) || onTownTrack(n)) continue
      const via = [n]
      for (let at = n; ; ) {
        const next = [...adj.get(at)!].filter((x) => !via.includes(x) && x !== start && !cpOfBlock.has(x))
        if (next.length !== 1) break
        via.push((at = next[0]!))
      }
      towns.get(townOf.get(cp.id)!)!.deadEnds.push({ from: cp.id, via })
    }
  }

  // A control point with no track of its own (a line's end) belongs at the dead end its signals stand on. When two
  // control points lead into that dead end, it's the one nearer the dead end's start.
  for (const cp of cps.filter((c) => !c.blocks.some((b) => cpOfBlock.has(b)))) {
    const at = center(cp.id)
    if (!at) continue
    const options = [...towns.values()]
      .flatMap((town) => town.deadEnds.map((end) => {
        const from = center(end.from)
        return { town, end, dist: distTo(end.via.at(-1)!, at), lead: from ? distTo(end.via[0]!, from) : Infinity }
      }))
      .filter((o) => o.dist < ATTACH_WITHIN)
      .sort((a, b) => a.dist - b.dist || a.lead - b.lead)
    const best = options[0]
    if (!best) continue
    between.push({ from: best.end.from, to: cp.id, via: best.end.via })
    for (const o of options) if (o.end.via.at(-1) === best.end.via.at(-1)) o.town.deadEnds.splice(o.town.deadEnds.indexOf(o.end), 1)
  }

  // Which towns are next to which, by the shortest run of blocks between them.
  const links = new Map([...towns.keys()].map((name) => [name, new Map<string, CtcLink>()]))
  for (const r of between) {
    const a = townOf.get(r.from)!
    const b = townOf.get(r.to)!
    const known = links.get(a)!.get(b)
    if (known && known.via.length <= r.via.length) continue
    links.get(a)!.set(b, { from: r.from, to: r.to, via: r.via })
    links.get(b)!.set(a, { from: r.to, to: r.from, via: [...r.via].reverse() })
  }

  // Each line: from the end farthest east (largest x), so boards read east to west, walking from town to town. A
  // junction where a branch leaves carries on along the longer way; the branch is its own line.
  const eastOf = (name: string) => Math.max(-Infinity, ...towns.get(name)!.controlPoints.map((id) => center(id)?.[0] ?? -Infinity))
  const placed = new Set<string>()
  const lines: CtcLineData[] = []
  const reach = (from: string, without: Set<string>): number => {
    let count = 0
    const stack = [from]
    const visited = new Set(without)
    while (stack.length) {
      const at = stack.pop()!
      if (visited.has(at)) continue
      visited.add(at)
      count++
      stack.push(...links.get(at)!.keys())
    }
    return count
  }
  for (;;) {
    const left = [...towns.keys()].filter((n) => !placed.has(n))
    if (!left.length) break
    const ends = left.filter((n) => [...links.get(n)!.keys()].filter((m) => !placed.has(m)).length <= 1)
    const start = (ends.length ? ends : left).sort((a, b) => eastOf(b) - eastOf(a))[0]!
    const order: string[] = []
    for (let at: string | undefined = start; at; ) {
      order.push(at)
      placed.add(at)
      const next: string[] = [...links.get(at)!.keys()].filter((n) => !placed.has(n))
      at = next.sort((a, b) => reach(b, placed) - reach(a, placed))[0]
    }
    lines.push({ towns: order.map((n) => towns.get(n)!), links: order.slice(1).map((n, i) => links.get(order[i]!)!.get(n)!) })
  }

  // Each town's control points in board order: the one its link from the previous town reaches first.
  for (const line of lines) {
    line.towns.forEach((town, i) => {
      if (town.controlPoints.length !== 2) return
      const inFrom = line.links[i - 1]?.to
      const outFrom = line.links[i]?.from
      const left = inFrom ?? town.controlPoints.find((id) => id !== outFrom)!
      if (town.controlPoints[0] !== left) town.controlPoints.reverse()
      // Tracks run left to right too.
      const leftAt = center(left)
      const fromLeft = (via: string[]) => (leftAt ? [...via].sort((a, b) => distTo(a, leftAt) - distTo(b, leftAt)) : via)
      town.main = fromLeft(town.main)
      town.sidings = town.sidings.map(fromLeft)
    })
  }
  return lines.sort((a, b) => b.towns.length - a.towns.length)
}
