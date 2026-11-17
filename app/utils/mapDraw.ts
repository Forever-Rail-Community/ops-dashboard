// Draws the map onto a canvas. One function per layer; drawMap decides which run.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

// Everything one drawing of the map depends on.
export interface MapFrame {
  map: MapData
  view: MapViewState
  layers: MapLayers
  selected: MapHit | null
  highlight: MapIndustry | null // an industry whose track is highlighted
  live: LiveMapData
  palette: MapPalette
  tiles: TileCache | null // null when the real-world map isn't available
  units: UnitSystem
}

interface Scene extends MapFrame {
  ctx: Ctx
  unlined: Map<string, number> // the piece each switch isn't lined for, by switch id; empty when switches are hidden
  accent: string // the brand color, used for the selection ring
  p: Projector
  zoom: number // how far in we are relative to the whole-railroad view
}

// What changes while the map is open, as opposed to the railroad itself.
export interface LiveMapData {
  trains: LiveTrain[] // already placed on the drawn track
  stale: boolean // the game server has stopped reporting trains, so these are last known positions
  switches: Record<string, boolean> // thrown, by the game's switch id
  switchesStale: boolean
  switchLegs: Record<string, [string, string]> // [normal, reverse] piece ids, by switch id (from the signals mod)
  industries: RailroaderIndustries // cars at industries and passengers waiting
  industriesStale: boolean
  industriesReported: boolean // false until a game server has sent them (needs tracker pack 0.3 or newer)
  signals: LiveSignals
}

// Signals from the Forever Rail Signals mod: where they are (fetched separately, rarely) and what they show.
export interface LiveSignals {
  layout: RailroaderSignalLayout | null // null until a server has sent one
  aspects: Record<string, SignalAspect>
  occupied: Record<string, boolean>
  stale: boolean
}

const STOP_LABEL_ZOOM = 3
// Town names start past the selection ring, so selecting a town doesn't cover its name.
const SELECTION_RADIUS = 13
const INDUSTRY_LABEL_ZOOM = 6

const onScreen = (s: Scene, x: number, y: number, margin = 20) =>
  x > -margin && x < s.view.w + margin && y > -margin && y < s.view.h + margin

// Text with an outline so it stays readable over track.
function label(s: Scene, text: string, x: number, y: number, color = s.palette.ink) {
  const { ctx } = s
  ctx.lineWidth = 3
  ctx.strokeStyle = s.palette.halo
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

// The pit is a ring, with the bridge drawn across it from the default stall to the one opposite.
function drawTurntables(s: Scene) {
  const { ctx, map, p, view, palette } = s
  for (const t of map.turntables) {
    const bridge: [number, number, number, number] = [p.x(t.bridge[0]), p.y(t.bridge[1]), p.x(t.bridge[2]), p.y(t.bridge[3])]
    drawTurntableShape(ctx, p.x(t.x), p.y(t.z), Math.max(4, t.r * view.s), bridge, palette)
  }
}

// Switches are the track points where three pieces meet. Too small to matter until zoomed in. Which way one is
// lined shows on the track (see mapSwitches.ts); a switch that can't show it that way gets a hollow ring instead.
// Close in, the rings grow with the track.
function drawUnreportedSwitches(s: Scene) {
  const { ctx, map, p, view, unlined } = s
  const scale = switchRingScale(view)
  map.switches.forEach((node, k) => {
    if (unlined.has(map.switchIds[k]!)) return
    const [x, z] = map.nodes[node]!
    if (onScreen(s, p.x(x), p.y(z), 10)) drawSymbol(ctx, 'switch', p.x(x), p.y(z), s.palette, { scale })
  })
}

function drawIndustryMarkers(s: Scene) {
  const { ctx, map, layers, p, palette } = s
  for (const ind of map.industries) {
    if (!industryVisible(ind, layers)) continue
    const x = p.x(ind.x), y = p.y(ind.z)
    if (!onScreen(s, x, y, 10)) continue
    drawSymbol(ctx, isPassengerStop(ind) ? 'stop' : 'industry', x, y, palette, { fill: palette.industry[industryType(ind)] })
  }
}

// Faded when the positions are old, so nobody mistakes them for live ones.
function drawTrains(s: Scene) {
  const { ctx, p, palette, live } = s
  ctx.globalAlpha = live.stale ? 0.4 : 1
  for (const t of live.trains) {
    const x = p.x(t.x), y = p.y(t.z)
    if (onScreen(s, x, y, 20)) drawTrainShape(ctx, x, y, t.heading, isMoving(t), palette)
  }
  ctx.globalAlpha = 1
}

function drawPlaceMarkers(s: Scene) {
  const { ctx, map, p, palette } = s
  for (const area of map.areas) {
    const x = p.x(area.x), y = p.y(area.z)
    if (onScreen(s, x, y, 10)) drawSymbol(ctx, 'place', x, y, palette)
  }
}

interface Label {
  text: string
  x: number
  y: number
  font: string
  color: string
}

// Labels are listed most important first. A label that would overlap one already drawn (or a train's tag) is
// skipped, so zooming in reveals more names instead of piling them on top of each other.
function labelsFor(s: Scene): Label[] {
  const { map, layers, p, zoom, palette } = s
  const labels: Label[] = []

  if (layers.places) {
    for (const area of [...map.areas].sort((a, b) => b.r - a.r)) {
      labels.push({ text: area.name, x: p.x(area.x) + SELECTION_RADIUS + 3, y: p.y(area.z), font: `600 12.5px ${MAP_FONT}`, color: palette.strong })
    }
  }
  const industries = map.industries.filter((i) => industryVisible(i, layers))
  const stops = industries.filter(isPassengerStop)
  const others = industries.filter((i) => !isPassengerStop(i))
  const small = (list: MapIndustry[]) =>
    list.map((i) => ({ text: i.name, x: p.x(i.x) + SYMBOL_RADIUS.stop + 3, y: p.y(i.z), font: `11px ${MAP_FONT}`, color: palette.ink }))
  if (zoom > STOP_LABEL_ZOOM) labels.push(...small(stops))
  if (zoom > INDUSTRY_LABEL_ZOOM) labels.push(...small(others))
  return labels
}

function drawLabels(s: Scene, taken: number[][]) {
  const { ctx } = s
  for (const l of labelsFor(s)) {
    if (!onScreen(s, l.x, l.y, 60)) continue
    ctx.font = l.font
    const box = [l.x, l.y - 8, l.x + ctx.measureText(l.text).width, l.y + 8]
    const overlaps = taken.some((t) => box[0]! < t[2]! && box[2]! > t[0]! && box[1]! < t[3]! && box[3]! > t[1]!)
    if (overlaps) continue
    taken.push(box)
    label(s, l.text, l.x, l.y, l.color)
  }
}

function drawSelection(s: Scene) {
  if (!s.selected) return
  const { ctx, p } = s
  // A selected train is followed as it moves.
  const train = s.selected.type === 'train' ? s.live.trains.find((t) => t.id === s.selected!.id) : undefined
  const at = train ?? s.selected
  ctx.strokeStyle = s.accent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(p.x(at.x), p.y(at.z), SELECTION_RADIUS, 0, Math.PI * 2)
  ctx.stroke()
}

// The longest round length in the person's units that fits in about 140 pixels. Map units are meters.
function drawScaleBar(s: Scene) {
  const { ctx, view } = s
  const steps = scaleSteps(s.units)
  const step = [...steps].reverse().find((st) => st.meters <= 140 / view.s) ?? steps[0]!
  const px = step.meters * view.s
  const y = view.h - 30 // clear of the map credit line
  ctx.strokeStyle = s.palette.ink
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(16, y); ctx.lineTo(16 + px, y)
  ctx.moveTo(16, y - 5); ctx.lineTo(16, y + 5)
  ctx.moveTo(16 + px, y - 5); ctx.lineTo(16 + px, y + 5)
  ctx.stroke()
  ctx.font = `11px ${MAP_FONT}`
  label(s, step.label, 16, y - 13)
}

export function drawMap(ctx: Ctx, frame: MapFrame, dpr: number) {
  const { map, view, layers, live, palette, tiles, highlight } = frame
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, view.w, view.h)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#111'
  const switchesShown = switchesVisible(view, layers)
  const unlined = switchesShown ? unlinedPieces(map, live.switchLegs, live.switches) : new Map<string, number>()
  const scene: Scene = { ...frame, ctx, accent, unlined, p: projector(view), zoom: view.s / view.fit }

  if (layers.background && tiles) drawBackground(ctx, map, view, scene.p, palette.tiles, tiles)
  const signalsShown = signalsVisible(view, layers)
  if (signalsShown) drawOccupiedBlocks(ctx, view, scene.p, live.signals, palette)
  drawTrack(ctx, map, view, scene.p, layers.speed, palette, new Set(unlined.values()))
  if (highlight) drawTrackHighlight(ctx, map, view, scene.p, highlight.track, palette.industry[industryType(highlight)])
  if (layers.turntables) drawTurntables(scene)
  if (switchesShown) drawUnreportedSwitches(scene)
  if (signalsShown) drawSignals(ctx, view, scene.p, live.signals, palette)
  drawIndustryMarkers(scene)
  if (layers.places) drawPlaceMarkers(scene)
  if (layers.trains) drawTrains(scene)
  // Train tags are laid out first so town and industry names keep clear of them, and drawn last so they stay on top.
  const tags = layers.trains ? layoutTrainTags(ctx, live.trains, scene.p, view.w, view.h, frame.units) : []
  drawLabels(scene, tags.map((t) => [...t.box]))
  ctx.globalAlpha = live.stale ? 0.4 : 1
  drawTrainTags(ctx, tags, palette)
  ctx.globalAlpha = 1
  drawSelection(scene)
  drawScaleBar(scene)
}
