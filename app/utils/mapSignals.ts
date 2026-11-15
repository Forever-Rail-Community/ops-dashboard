// Signals and occupied blocks on the map, from the Forever Rail Signals mod.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

const SIDE_PX = 6 // a signal's foot stands this far to the right of the track (the side it stands on, for its trains)

// Where a signal is drawn: its foot beside the track, and the way its trains run on screen (y grows downward).
export function signalPose(signal: SignalDef, p: Projector): SignalPose {
  const length = Math.hypot(signal.dx, signal.dz)
  const [alongX, alongY] = length ? [signal.dx / length, -signal.dz / length] : [1, 0]
  // The right-hand side of the way its trains run.
  return { x: p.x(signal.x) - alongY * SIDE_PX, y: p.y(signal.z) + alongX * SIDE_PX, alongX, alongY }
}

// A translucent band along each occupied block's track, under the track itself.
export function drawOccupiedBlocks(ctx: Ctx, view: MapViewState, p: Projector, live: LiveSignals, palette: MapPalette) {
  if (!live.layout) return
  const width = Math.max(8, trackLineWidth(view.s, view.s / view.fit) + 8)
  const path = new Path2D()
  for (const block of live.layout.blocks) {
    if (!live.occupied[block.id]) continue
    for (const piece of block.track) {
      path.moveTo(p.x(piece[0]![0]), p.y(piece[0]![1]))
      for (const [x, z] of piece.slice(1)) path.lineTo(p.x(x), p.y(z))
    }
  }
  ctx.save()
  ctx.globalAlpha = live.stale ? 0.15 : 0.35
  ctx.strokeStyle = palette.occupied
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(path)
  ctx.restore()
}

export function drawSignals(ctx: Ctx, view: MapViewState, p: Projector, live: LiveSignals, palette: MapPalette) {
  if (!live.layout) return
  ctx.save()
  ctx.globalAlpha = live.stale ? 0.4 : 1
  for (const signal of live.layout.signals) {
    const pose = signalPose(signal, p)
    if (pose.x < -30 || pose.x > view.w + 30 || pose.y < -30 || pose.y > view.h + 30) continue
    drawSignalShape(ctx, pose, live.aspects[signal.id] ?? 'unknown', palette)
  }
  ctx.restore()
}
