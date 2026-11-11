// Converting between world coordinates (x east, z north) and canvas pixels (y down).

export function projector(v: MapViewState) {
  return {
    x: (wx: number) => v.w / 2 + (wx - v.cx) * v.s,
    y: (wz: number) => v.h / 2 - (wz - v.cz) * v.s,
    worldX: (px: number) => v.cx + (px - v.w / 2) / v.s,
    worldZ: (py: number) => v.cz - (py - v.h / 2) / v.s
  }
}

// Room to leave around the railroad, in pixels, so town names at the edges aren't clipped.
const PAD_X = 64
const PAD_Y = 40

// The scale at which the whole railroad fits the canvas.
export function fitScale(bounds: MapData['bounds'], w: number, h: number) {
  const [x0, z0, x1, z1] = bounds
  return Math.min(Math.max(1, w - 2 * PAD_X) / (x1 - x0), Math.max(1, h - 2 * PAD_Y) / (z1 - z0))
}
