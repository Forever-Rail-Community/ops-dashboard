// Draws the map onto a canvas. One function per layer; drawMap decides which run.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

interface Scene {
  ctx: Ctx
  map: MapData
  view: MapViewState
  layers: MapLayers
  selected: MapHit | null
  accent: string // the brand color, used for the selection ring
  p: Projector
  zoom: number // how far in we are relative to the whole-railroad view
}

const FONT = 'Inter Variable, system-ui, sans-serif'
const INK = '#27272a'
const SWITCH_ZOOM = 4 // how far in (relative to the whole-railroad view) before switches and names appear
const STOP_LABEL_ZOOM = 3
const INDUSTRY_LABEL_ZOOM = 6

const onScreen = (s: Scene, x: number, y: number, margin = 20) =>
  x > -margin && x < s.view.w + margin && y > -margin && y < s.view.h + margin

// Text with a white outline so it stays readable over track.
function label(ctx: Ctx, text: string, x: number, y: number, color = INK) {
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'
  ctx.strokeText(text, x, y)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}

function dot(ctx: Ctx, x: number, y: number, radius: number, fill: string, stroke: string, lineWidth: number) {
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function diamond(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = '#1d4ed8'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.lineTo(x + r, y)
  ctx.lineTo(x, y + r)
  ctx.lineTo(x - r, y)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawTrack(s: Scene) {
  const { ctx, map, layers, p, view } = s
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.min(4, Math.max(1.2, 1.2 + Math.log2(s.zoom) * 0.7))

  // One pass per speed limit, so each color is a single path.
  const limits = layers.speed ? speedLimitsIn(map) : [null]
  for (const limit of limits) {
    ctx.strokeStyle = limit === null ? '#52525b' : speedColor(limit)
    ctx.beginPath()
    for (const [a, b, speed] of map.segments) {
      if (limit !== null && speed !== limit) continue
      const [ax, az] = map.nodes[a]!
      const [bx, bz] = map.nodes[b]!
      const x1 = p.x(ax), y1 = p.y(az), x2 = p.x(bx), y2 = p.y(bz)
      const offLeft = x1 < -20 && x2 < -20
      const offRight = x1 > view.w + 20 && x2 > view.w + 20
      const offTop = y1 < -20 && y2 < -20
      const offBottom = y1 > view.h + 20 && y2 > view.h + 20
      if (offLeft || offRight || offTop || offBottom) continue
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  }
}

function drawTurntables(s: Scene) {
  const { ctx, map, p, view } = s
  ctx.strokeStyle = '#3f3f46'
  ctx.lineWidth = 1.5
  for (const t of map.turntables) {
    ctx.beginPath()
    ctx.arc(p.x(t.x), p.y(t.z), Math.max(4, t.r * view.s), 0, Math.PI * 2)
    ctx.stroke()
  }
}

// Switches are the track points where three pieces meet. Too small to matter until zoomed in.
function drawSwitches(s: Scene) {
  const { ctx, map, p } = s
  for (const i of map.switches) {
    const [x, z] = map.nodes[i]!
    if (onScreen(s, p.x(x), p.y(z), 5)) dot(ctx, p.x(x), p.y(z), 2.3, '#2563eb', '#fff', 1)
  }
}

function drawIndustryMarkers(s: Scene) {
  const { ctx, map, layers, p } = s
  for (const ind of map.industries) {
    if (!industryVisible(ind, layers)) continue
    const x = p.x(ind.x), y = p.y(ind.z)
    if (!onScreen(s, x, y, 10)) continue
    if (isPassengerStop(ind)) diamond(ctx, x, y, 6)
    else dot(ctx, x, y, 4, '#18181b', '#fff', 1.5)
  }
}

function drawPlaceMarkers(s: Scene) {
  const { ctx, map, p } = s
  for (const area of map.areas) {
    const x = p.x(area.x), y = p.y(area.z)
    if (onScreen(s, x, y, 10)) dot(ctx, x, y, 4.5, '#fff', '#18181b', 2)
  }
}

interface Label {
  text: string
  x: number
  y: number
  font: string
  color: string
}

// Labels are listed most important first. A label that would overlap one already drawn is skipped,
// so zooming in reveals more names instead of piling them on top of each other.
function labelsFor(s: Scene): Label[] {
  const { map, layers, p, zoom } = s
  const labels: Label[] = []

  if (layers.places) {
    for (const area of [...map.areas].sort((a, b) => b.r - a.r)) {
      labels.push({ text: area.name, x: p.x(area.x) + 8, y: p.y(area.z), font: `600 12.5px ${FONT}`, color: '#09090b' })
    }
  }
  const industries = map.industries.filter((i) => industryVisible(i, layers))
  const stops = industries.filter(isPassengerStop)
  const others = industries.filter((i) => !isPassengerStop(i))
  const small = (list: MapIndustry[]) =>
    list.map((i) => ({ text: i.name, x: p.x(i.x) + 9, y: p.y(i.z), font: `11px ${FONT}`, color: INK }))
  if (zoom > STOP_LABEL_ZOOM) labels.push(...small(stops))
  if (zoom > INDUSTRY_LABEL_ZOOM) labels.push(...small(others))
  return labels
}

function drawLabels(s: Scene) {
  const { ctx } = s
  const taken: number[][] = []
  for (const l of labelsFor(s)) {
    if (!onScreen(s, l.x, l.y, 60)) continue
    ctx.font = l.font
    const box = [l.x, l.y - 8, l.x + ctx.measureText(l.text).width, l.y + 8]
    const overlaps = taken.some((t) => box[0]! < t[2]! && box[2]! > t[0]! && box[1]! < t[3]! && box[3]! > t[1]!)
    if (overlaps) continue
    taken.push(box)
    label(ctx, l.text, l.x, l.y, l.color)
  }
}

function drawSelection(s: Scene) {
  if (!s.selected) return
  const { ctx, p } = s
  ctx.strokeStyle = s.accent
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(p.x(s.selected.x), p.y(s.selected.z), 11, 0, Math.PI * 2)
  ctx.stroke()
}

// Units are assumed to be meters.
function drawScaleBar(s: Scene) {
  const { ctx, view } = s
  const steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  const meters = [...steps].reverse().find((m) => m <= 140 / view.s) ?? steps[0]!
  const px = meters * view.s
  const y = view.h - 16
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(16, y); ctx.lineTo(16 + px, y)
  ctx.moveTo(16, y - 5); ctx.lineTo(16, y + 5)
  ctx.moveTo(16 + px, y - 5); ctx.lineTo(16 + px, y + 5)
  ctx.stroke()
  ctx.font = `11px ${FONT}`
  label(ctx, meters >= 1000 ? `${meters / 1000} km` : `${meters} m`, 16, y - 13)
}

export function drawMap(
  ctx: Ctx,
  map: MapData,
  view: MapViewState,
  layers: MapLayers,
  selected: MapHit | null,
  dpr: number
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, view.w, view.h)
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'

  const accent = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#111'
  const scene: Scene = { ctx, map, view, layers, selected, accent, p: projector(view), zoom: view.s / view.fit }

  drawTrack(scene)
  if (layers.turntables) drawTurntables(scene)
  if (layers.switches && scene.zoom > SWITCH_ZOOM) drawSwitches(scene)
  drawIndustryMarkers(scene)
  if (layers.places) drawPlaceMarkers(scene)
  drawLabels(scene)
  drawSelection(scene)
  drawScaleBar(scene)
}
