// Draws the track. Far out it is a line colored by speed limit; closer in it sits on a ballast bed so crossing and
// neighboring tracks stay distinct; close in it is drawn to scale, with two rails and ties.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

// Real-world sizes in meters. Standard gauge is 1.435 m between the rails.
const GAUGE = 1.435
const TIE_LENGTH = 2.6
const TIE_WIDTH = 0.25
const TIE_SPACING = 0.6 // gap between ties
const BED_WIDTH = 3.4

// From this scale (pixels per meter) on, track is drawn to scale.
export const DETAIL_SCALE = 4
// Below this zoom (relative to the whole-railroad view) there is no ballast bed: the lines are too close together.
const BED_ZOOM = 6

// Line width in pixels when not drawn to scale: grows as you zoom in, and never narrower than a 1.8 m band,
// so it meets the to-scale drawing without a jump.
export const trackLineWidth = (scale: number, zoom: number) =>
  Math.max(Math.min(3, 1.6 + 0.45 * Math.log2(Math.max(1, zoom))), 1.8 * scale)

interface Piece {
  speed: number
  curve: [Point, Point, Point, Point] // in screen pixels
}

// The pieces on screen, with their curves already in screen pixels.
function visiblePieces(map: MapData, p: Projector, w: number, h: number): Piece[] {
  const margin = 40
  const pieces: Piece[] = []
  for (const [a, b, speed] of map.segments) {
    const { from, handle1, handle2, to } = curveBetween(map, a, b)
    const curve = [from, handle1, handle2, to].map(([x, z]): Point => [p.x(x), p.y(z)]) as Piece['curve']
    const xs = curve.map((q) => q[0])
    const ys = curve.map((q) => q[1])
    if (Math.max(...xs) < -margin || Math.min(...xs) > w + margin || Math.max(...ys) < -margin || Math.min(...ys) > h + margin) continue
    pieces.push({ speed, curve })
  }
  return pieces
}

function pathOf(pieces: Piece[]) {
  const path = new Path2D()
  for (const { curve: [a, c1, c2, b] } of pieces) {
    path.moveTo(a[0], a[1])
    path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], b[0], b[1])
  }
  return path
}

// A line beside the piece's curve, `offset` pixels to its left (negative: right). Used for the two rails.
function offsetLine(curve: Piece['curve'], offset: number, steps: number) {
  const [a, c1, c2, b] = curve
  const at = (t: number): Point => {
    const u = 1 - t
    return [
      u * u * u * a[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * b[0],
      u * u * u * a[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * b[1]
    ]
  }
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const [x0, y0] = at(Math.max(0, t - 0.001))
    const [x1, y1] = at(Math.min(1, t + 0.001))
    const len = Math.hypot(x1 - x0, y1 - y0) || 1
    const [x, y] = at(t)
    points.push([x - ((y1 - y0) / len) * offset, y + ((x1 - x0) / len) * offset])
  }
  return points
}

// Groups pieces by the color they are drawn in, so each color is one path and one stroke.
function byColor(pieces: Piece[], colorOf: (speed: number) => string) {
  const groups = new Map<string, Piece[]>()
  for (const piece of pieces) {
    const color = colorOf(piece.speed)
    groups.set(color, [...(groups.get(color) ?? []), piece])
  }
  return groups
}

export function drawTrack(ctx: Ctx, map: MapData, view: MapViewState, p: Projector, bySpeed: boolean, palette: MapPalette) {
  const pieces = visiblePieces(map, p, view.w, view.h)
  const zoom = view.s / view.fit
  const colorOf = (speed: number) => (bySpeed ? speedColor(palette, speed) : palette.track)
  const all = pathOf(pieces)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (view.s < DETAIL_SCALE) {
    const width = trackLineWidth(view.s, zoom)
    if (zoom >= BED_ZOOM) {
      ctx.strokeStyle = palette.ballast
      ctx.lineWidth = width + 4
      ctx.stroke(all)
    }
    ctx.lineWidth = width
    for (const [color, group] of byColor(pieces, colorOf)) {
      ctx.strokeStyle = color
      ctx.stroke(pathOf(group))
    }
    ctx.restore()
    return
  }

  // To scale: ballast bed, then ties across it, then the two rails.
  const px = (meters: number) => meters * view.s
  ctx.strokeStyle = palette.ballast
  ctx.lineWidth = px(BED_WIDTH)
  ctx.stroke(all)

  ctx.lineCap = 'butt'
  ctx.strokeStyle = palette.tie
  ctx.lineWidth = px(TIE_LENGTH)
  ctx.setLineDash([px(TIE_WIDTH), px(TIE_SPACING)])
  ctx.stroke(all)
  ctx.setLineDash([])

  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(2, px(0.3))
  const half = px(GAUGE / 2)
  for (const [color, group] of byColor(pieces, colorOf)) {
    const rails = new Path2D()
    for (const { curve } of group) {
      // Enough points that the rails follow the curve smoothly at this size.
      const steps = Math.min(64, Math.max(4, Math.ceil(Math.hypot(curve[3][0] - curve[0][0], curve[3][1] - curve[0][1]) / 12)))
      for (const side of [half, -half]) {
        const line = offsetLine(curve, side, steps)
        rails.moveTo(line[0]![0], line[0]![1])
        for (const [x, y] of line.slice(1)) rails.lineTo(x, y)
      }
    }
    ctx.strokeStyle = color
    ctx.stroke(rails)
  }
  ctx.restore()
}
