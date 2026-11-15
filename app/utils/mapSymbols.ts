// Every symbol on the map, drawn in one place. The map canvas and the map key both use these,
// so the key always matches what is on the map.

type Ctx = CanvasRenderingContext2D

export type MapSymbol =
  | 'place' | 'industry' | 'stop' | 'switch' | 'switchOpen' | 'switchClosed' | 'turntable' | 'trainMoving' | 'trainStopped'
  | 'signalStop' | 'signalApproach' | 'signalClear' | 'signalRestricting' | 'blockOccupied'

// Size of each symbol in pixels: the distance from its center to its edge.
export const SYMBOL_RADIUS: Record<MapSymbol, number> = {
  place: 6,
  industry: 4.5,
  stop: 7.5,
  switch: 5.5,
  switchOpen: 5.5,
  switchClosed: 5.5,
  turntable: 7, // used by the key only; on the map a turntable is drawn at its real size
  trainMoving: 9,
  trainStopped: 9,
  signalStop: 5, // the lamp's radius, ring included
  signalApproach: 5,
  signalClear: 5,
  signalRestricting: 5,
  blockOccupied: 7 // used by the key only
}

// The key's signal symbols, by the aspect each stands for.
const SIGNAL_SYMBOLS: Partial<Record<MapSymbol, SignalAspect>> = {
  signalStop: 'stop',
  signalApproach: 'approach',
  signalClear: 'clear',
  signalRestricting: 'restricting'
}

// A signal, drawn the way railroad signal plans draw one: a foot at the edge of the track, a mast running along
// the track the way its trains go, and a lamp at the end in its aspect's color, set in a ring like a signal's
// target. Foot, mast and ring share the label color, so a signal reads as one glyph, unlike the round switch
// markers. Shape adds to color: a bar across the lamp for stop, a hollow lamp for restricting (grey when not
// reported). Diverging aspects look like their plain ones.
export interface SignalPose {
  x: number // the foot, beside the track
  y: number
  alongX: number // the way its trains run, on screen (a unit vector)
  alongY: number
}

const SIGNAL_FOOT = 5 // half the foot's length, px
const SIGNAL_MAST = 11 // mast length, px
const SIGNAL_RING = 2.5 // the target ring around the lamp, px

// Where a signal's lamp is drawn: what the pointer has to be near.
export const signalLamp = (pose: SignalPose, scale = 1) => {
  const reach = SIGNAL_MAST + SYMBOL_RADIUS.signalStop * scale + SIGNAL_RING
  return { x: pose.x + pose.alongX * reach, y: pose.y + pose.alongY * reach }
}

export function drawSignalShape(ctx: Ctx, pose: SignalPose, aspect: SignalAspect, palette: MapPalette, scale = 1) {
  const { x, y, alongX, alongY } = pose
  const r = SYMBOL_RADIUS.signalStop * scale
  const lamp = signalLamp(pose, scale)
  const color = palette.aspects[aspect]

  ctx.save()
  ctx.strokeStyle = palette.ink
  ctx.lineWidth = 2.25
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - alongY * SIGNAL_FOOT, y + alongX * SIGNAL_FOOT) // the foot, across the mast
  ctx.lineTo(x + alongY * SIGNAL_FOOT, y - alongX * SIGNAL_FOOT)
  ctx.moveTo(x, y) // the mast
  ctx.lineTo(x + alongX * SIGNAL_MAST, y + alongY * SIGNAL_MAST)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(lamp.x, lamp.y, r + SIGNAL_RING / 2, 0, Math.PI * 2)
  ctx.fillStyle = palette.ink
  ctx.fill()
  ctx.beginPath()
  ctx.arc(lamp.x, lamp.y, r - SIGNAL_RING / 2, 0, Math.PI * 2)
  if (aspect === 'restricting' || aspect === 'unknown') {
    paint(ctx, palette.outline, color, 2)
  } else {
    ctx.fillStyle = color
    ctx.fill()
  }
  if (aspect === 'stop') {
    ctx.fillStyle = palette.outline
    ctx.fillRect(lamp.x - r * 0.6, lamp.y - r * 0.18, r * 1.2, r * 0.36)
  }
  ctx.restore()
}

function paint(ctx: Ctx, fill: string, stroke: string, lineWidth: number) {
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.fill()
  ctx.stroke()
}

// A ring for the pit, and a heavier line for the bridge across it.
export function drawTurntableShape(ctx: Ctx, x: number, y: number, r: number, bridge: [number, number, number, number], palette: MapPalette) {
  ctx.strokeStyle = palette.turntable
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(bridge[0], bridge[1])
  ctx.lineTo(bridge[2], bridge[3])
  ctx.stroke()
}

// An arrow pointing the way the train is going (degrees clockwise from north, which is up on the map).
// Filled while moving, outlined while stopped, so the two differ by shape and not only by color.
export function drawTrainShape(ctx: Ctx, x: number, y: number, heading: number, moving: boolean, palette: MapPalette) {
  const r = SYMBOL_RADIUS.trainMoving
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((heading * Math.PI) / 180)
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.15)
  ctx.lineTo(r * 0.8, r * 0.85)
  ctx.lineTo(0, r * 0.4)
  ctx.lineTo(-r * 0.8, r * 0.85)
  ctx.closePath()
  ctx.lineJoin = 'round'
  if (moving) {
    paint(ctx, palette.train, palette.outline, 1.5)
  } else {
    paint(ctx, palette.outline, palette.train, 2)
  }
  ctx.restore()
}

// A switch: a disc in its state's color with a bar along the track's direction (`angle`, degrees clockwise from
// north). Straight bar: lined straight. Slanted bar: thrown to the diverging route. Hollow ring: not reported.
// The shape tells the states apart as well as the color does.
function drawSwitchShape(ctx: Ctx, symbol: 'switch' | 'switchOpen' | 'switchClosed', x: number, y: number, r: number, angle: number, palette: MapPalette) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  if (symbol === 'switch') {
    paint(ctx, palette.outline, palette.switch, 2)
    return ctx.restore()
  }
  paint(ctx, symbol === 'switchOpen' ? palette.switchOpen : palette.switchClosed, palette.outline, 1.5)
  ctx.beginPath()
  if (symbol === 'switchOpen') {
    ctx.moveTo(0, -r * 0.62)
    ctx.lineTo(0, r * 0.62)
  } else {
    ctx.moveTo(-r * 0.42, r * 0.5)
    ctx.lineTo(r * 0.42, -r * 0.5)
  }
  ctx.strokeStyle = palette.outline
  ctx.lineWidth = Math.max(1.5, r * 0.3)
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.restore()
}

export interface SymbolOptions {
  angle?: number // turns symbols that follow the track (switches), degrees clockwise from north
  scale?: number // enlarges a symbol when zoomed far in
  fill?: string // an industry's color (its main type); otherwise the palette's
}

export function drawSymbol(ctx: Ctx, symbol: MapSymbol, x: number, y: number, palette: MapPalette, { angle = 0, scale = 1, fill }: SymbolOptions = {}) {
  const r = SYMBOL_RADIUS[symbol] * scale
  ctx.beginPath()
  switch (symbol) {
    case 'place': // hollow circle
      ctx.arc(x, y, r, 0, Math.PI * 2)
      return paint(ctx, palette.outline, palette.marker, 2)
    case 'industry': // solid square
      ctx.rect(x - r, y - r, r * 2, r * 2)
      return paint(ctx, fill ?? palette.marker, palette.outline, 1.5)
    case 'stop': // diamond
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
      return paint(ctx, fill ?? palette.industry.passenger, palette.outline, 1.5)
    case 'switch':
    case 'switchOpen':
    case 'switchClosed':
      return drawSwitchShape(ctx, symbol, x, y, r, angle, palette)
    case 'turntable':
      return drawTurntableShape(ctx, x, y, r, [x - r, y, x + r, y], palette)
    case 'trainMoving':
      return drawTrainShape(ctx, x, y, 90, true, palette)
    case 'trainStopped':
      return drawTrainShape(ctx, x, y, 90, false, palette)
    case 'signalStop':
    case 'signalApproach':
    case 'signalClear':
    case 'signalRestricting':
      // In the key: foot on the left, lamp on the right, centered on (x, y).
      return drawSignalShape(ctx, { x: x - 12, y, alongX: 1, alongY: 0 }, SIGNAL_SYMBOLS[symbol]!, palette, scale)
    case 'blockOccupied': // a short band of track, as drawn on the map
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = palette.occupied
      ctx.lineCap = 'round'
      ctx.lineWidth = r
      ctx.moveTo(x - r, y)
      ctx.lineTo(x + r, y)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineWidth = 2
      ctx.strokeStyle = palette.track
      ctx.beginPath()
      ctx.moveTo(x - r, y)
      ctx.lineTo(x + r, y)
      return ctx.stroke()
  }
}
