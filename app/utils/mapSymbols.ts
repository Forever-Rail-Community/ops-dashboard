// Every symbol on the map, drawn in one place. The map canvas and the map key both use these,
// so the key always matches what is on the map.

type Ctx = CanvasRenderingContext2D

export type MapSymbol = 'place' | 'industry' | 'stop' | 'switch' | 'turntable'

// Size of each symbol in pixels: the distance from its center to its edge.
export const SYMBOL_RADIUS: Record<MapSymbol, number> = {
  place: 6,
  industry: 4.5,
  stop: 7.5,
  switch: 3.5,
  turntable: 7 // used by the key only; on the map a turntable is drawn at its real size
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

export function drawSymbol(ctx: Ctx, symbol: MapSymbol, x: number, y: number, palette: MapPalette) {
  const r = SYMBOL_RADIUS[symbol]
  ctx.beginPath()
  switch (symbol) {
    case 'place': // hollow circle
      ctx.arc(x, y, r, 0, Math.PI * 2)
      return paint(ctx, palette.outline, palette.marker, 2)
    case 'industry': // solid square
      ctx.rect(x - r, y - r, r * 2, r * 2)
      return paint(ctx, palette.marker, palette.outline, 1.5)
    case 'stop': // diamond
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y)
      ctx.lineTo(x, y + r)
      ctx.lineTo(x - r, y)
      ctx.closePath()
      return paint(ctx, palette.stop, palette.outline, 1.5)
    case 'switch': // small dot
      ctx.arc(x, y, r, 0, Math.PI * 2)
      return paint(ctx, palette.switch, palette.outline, 1)
    case 'turntable':
      return drawTurntableShape(ctx, x, y, r, [x - r, y, x + r, y], palette)
  }
}
