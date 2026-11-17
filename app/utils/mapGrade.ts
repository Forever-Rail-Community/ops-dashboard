// Grades, from the heights the map data keeps for each track point. Between two points the height is taken to change
// evenly; pieces are short, so this is close to the game's own curve. A grade is the rise over the distance, in
// percent, and is signed in the train's direction of travel: positive is climbing.

export interface GradeStretch {
  piece: number
  from: number // meters from the train's lead end; negative is behind it
  to: number
  fromHeight: number
  toHeight: number
  grade: number
}

export interface GradeProfile {
  now: { height: number; grade: number }
  behind: GradeStretch[] // where the train has actually been, from its recorded history
  ahead: GradeStretch[] // the track in front of it, following the switches as they're lined
  endsAhead?: string // why the track ahead stops short, if it does
}

// Shorter stretches give unreliable grades (the heights are rounded to 10 cm), so they don't count as "steepest".
export const MIN_GRADE_STRETCH = 40

interface Graph {
  piecesAt: number[][] // by node
  length: number[] // by piece, meters along the drawn curve
}
const graphs = new WeakMap<MapData, Graph>()

function graphOf(map: MapData): Graph {
  let graph = graphs.get(map)
  if (!graph) {
    const piecesAt: number[][] = map.nodes.map(() => [])
    map.segments.forEach(([a, b], i) => {
      piecesAt[a]!.push(i)
      piecesAt[b]!.push(i)
    })
    graph = { piecesAt, length: map.segments.map(([a, b]) => measureCurve(curveBetween(map, a, b)).length) }
    graphs.set(map, graph)
  }
  return graph
}

const nodeHeight = (map: MapData, node: number) => map.nodes[node]![3]

// The height `fromA` meters along a piece from its end A.
function heightOn(map: MapData, piece: number, fromA: number) {
  const [a, b] = map.segments[piece]!
  const length = graphOf(map).length[piece]!
  return nodeHeight(map, a) + ((nodeHeight(map, b) - nodeHeight(map, a)) * Math.min(1, Math.max(0, fromA / (length || 1))))
}

// Where a train goes after reaching `node` over `from`: the only way on, or through a switch the way it's lined.
// A string says why it can't tell.
function nextPiece(map: MapData, node: number, from: number, switchLegs: Record<string, [string, string]>, thrown: Record<string, boolean>): number | string {
  const others = graphOf(map).piecesAt[node]!.filter((piece) => piece !== from)
  if (others.length === 0) return 'End of track'
  if (others.length === 1) return others[0]!
  const id = map.switchIds[map.switches.indexOf(node)]
  const legs = id ? switchLegs[id] : undefined
  if (!legs) return "A switch whose legs aren't reported"
  const [normal, reverse] = legs.map((leg) => pieceById(map, leg))
  // Coming in on either leg, the only way out is the points end.
  if (from === normal || from === reverse) return others.find((piece) => piece !== normal && piece !== reverse) ?? 'Unknown switch'
  const state = id ? thrown[id] : undefined
  if (state === undefined) return "A switch whose position isn't reported"
  return (state ? reverse : normal) ?? 'Unknown switch'
}

// The track ahead of the train for `meters`, following the switches as they're lined.
function walkAhead(map: MapData, live: LiveMapData, start: NonNullable<ReturnType<typeof trackPosition>>, meters: number) {
  const { length } = graphOf(map)
  const stretches: GradeStretch[] = []
  let piece = start.piece
  let towardB = start.towardB
  let left = towardB ? start.length - start.fromA : start.fromA // meters to the end of the current piece
  let height = heightOn(map, piece, start.fromA)
  let done = 0
  for (;;) {
    const [a, b] = map.segments[piece]!
    const node = towardB ? b : a
    const endHeight = nodeHeight(map, node)
    const run = Math.min(left, meters - done)
    if (run > 0) {
      const toHeight = height + ((endHeight - height) * run) / left
      stretches.push({ piece, from: done, to: done + run, fromHeight: height, toHeight, grade: ((toHeight - height) / run) * 100 })
    }
    done += run
    if (done >= meters) return { stretches }
    const next = nextPiece(map, node, piece, live.switchLegs, live.switches)
    if (typeof next === 'string') return { stretches, endsAhead: next }
    piece = next
    towardB = map.segments[piece]![0] === node
    left = length[piece]!
    height = endHeight
  }
}

// Where the train has been, from its recorded samples (oldest first), up to `meters` back from where it is now.
// Distances between samples are straight lines between the reported positions: close enough at one sample every
// 20 seconds, and it needs no guessing at which way it went through switches.
function walkBehind(map: MapData, train: LiveTrain, now: { height: number }, samples: TrainHistorySample[], meters: number) {
  const points: { x: number; z: number; height: number; piece: number }[] = []
  for (const sample of samples) {
    const at = trackPosition(map, sample.track, 0)
    if (at) points.push({ x: sample.x, z: sample.z, height: heightOn(map, at.piece, at.fromA), piece: at.piece })
  }
  const stretches: GradeStretch[] = []
  let to = 0
  let next = { x: train.x, z: train.z, height: now.height }
  for (let i = points.length - 1; i >= 0 && -to < meters; i--) {
    const p = points[i]!
    const run = Math.hypot(next.x - p.x, next.z - p.z)
    if (run < 1) continue // stopped: nothing to draw
    stretches.unshift({ piece: p.piece, from: to - run, to, fromHeight: p.height, toHeight: next.height, grade: ((next.height - p.height) / run) * 100 })
    to -= run
    next = p
  }
  return stretches
}

export function gradeProfile(map: MapData, live: LiveMapData, train: LiveTrain, history: TrainHistorySample[], ahead: number, behind: number): GradeProfile | undefined {
  const start = train.track && trackPosition(map, train.track, train.heading)
  if (!start) return undefined
  const [a, b] = map.segments[start.piece]!
  const rise = nodeHeight(map, b) - nodeHeight(map, a)
  const now = {
    height: heightOn(map, start.piece, start.fromA),
    grade: ((start.towardB ? rise : -rise) / (start.length || 1)) * 100
  }
  const front = walkAhead(map, live, start, ahead)
  return { now, behind: walkBehind(map, train, now, history, behind), ahead: front.stretches, endsAhead: front.endsAhead }
}

// What's coming: the steepest climb and descent, the top of the climb if it crests ahead, and the next town.
export function gradeOutlook(map: MapData, profile: GradeProfile, train: LiveTrain) {
  const long = profile.ahead.filter((s) => s.to - s.from >= MIN_GRADE_STRETCH)
  const climb = long.reduce<GradeStretch | undefined>((best, s) => (s.grade > (best?.grade ?? 0.3) ? s : best), undefined)
  const descent = long.reduce<GradeStretch | undefined>((best, s) => (s.grade < (best?.grade ?? -0.3) ? s : best), undefined)
  const highest = profile.ahead.reduce<GradeStretch | undefined>((best, s) => (!best || s.toHeight > best.toHeight ? s : best), undefined)
  // A top only counts if the track goes down again after it within the range; otherwise it's just where the chart ends.
  const end = profile.ahead.at(-1)?.to ?? 0
  const crests = highest && highest.to < end - MIN_GRADE_STRETCH && highest.toHeight > profile.now.height + 3
  const top = crests ? { height: highest.toHeight, at: highest.to } : undefined
  return { climb, descent, top, town: nextTown(map, profile, train) }
}

// The first town the track ahead enters, and how far ahead. The town the train is in now doesn't count.
function nextTown(map: MapData, profile: GradeProfile, train: LiveTrain) {
  const inside = (area: MapArea, x: number, z: number) => Math.hypot(area.x - x, area.z - z) < area.r
  const here = new Set(map.areas.filter((area) => inside(area, train.x, train.z)))
  for (const s of profile.ahead) {
    const [a, b] = map.segments[s.piece]!
    for (const node of [a, b]) {
      const [x, z] = map.nodes[node]!
      const town = map.areas.find((area) => !here.has(area) && inside(area, x, z))
      if (town) return { name: town.name, at: s.from }
    }
  }
  return undefined
}

// Steepness classes, either way, for colors: 0 level, then gentle, moderate and steep from each step (percent).
export const GRADE_STEPS = [0.5, 1.5, 2.5]
export const gradeClass = (grade: number) => GRADE_STEPS.filter((step) => Math.abs(grade) >= step).length

// How steep each piece is, either way, in percent: for the grade layer.
const pieceGradeCache = new WeakMap<MapData, number[]>()
export function pieceGrades(map: MapData) {
  let grades = pieceGradeCache.get(map)
  if (!grades) {
    const { length } = graphOf(map)
    grades = map.segments.map(([a, b], i) => (Math.abs(nodeHeight(map, b) - nodeHeight(map, a)) / Math.max(1, length[i]!)) * 100)
    pieceGradeCache.set(map, grades)
  }
  return grades
}
