// Track pieces are curves, not straight lines. Each node knows which way the track runs through it (its yaw),
// so a piece leaves one node heading that way and arrives at the next one heading its way.
// The shape is a cubic Bezier with handles a third of the way along the piece. It is an approximation of the
// game's own curve: close to it, but not checked against it.

export type Point = [number, number]
export interface Curve {
  from: Point
  handle1: Point
  handle2: Point
  to: Point
}

const HANDLE_SHARE = 1 / 3

export function curveBetween(map: MapData, a: number, b: number): Curve {
  const [ax, az, ayaw] = map.nodes[a]!
  const [bx, bz, byaw] = map.nodes[b]!
  const dx = bx - ax
  const dz = bz - az
  const reach = Math.hypot(dx, dz) * HANDLE_SHARE

  // The yaw gives an axis, not a direction, so point it the way the piece is going.
  const heading = (yaw: number): Point => {
    const rad = (yaw * Math.PI) / 180
    const sign = Math.sin(rad) * dx + Math.cos(rad) * dz >= 0 ? 1 : -1
    return [Math.sin(rad) * sign, Math.cos(rad) * sign]
  }
  const [hx1, hz1] = heading(ayaw)
  const [hx2, hz2] = heading(byaw)

  return {
    from: [ax, az],
    handle1: [ax + hx1 * reach, az + hz1 * reach],
    handle2: [bx - hx2 * reach, bz - hz2 * reach],
    to: [bx, bz]
  }
}

// Points along the curve, for finding what the pointer is over.
export function flatten(curve: Curve, steps = 8): Point[] {
  const { from, handle1, handle2, to } = curve
  const points: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const
    points.push([
      w[0] * from[0] + w[1] * handle1[0] + w[2] * handle2[0] + w[3] * to[0],
      w[0] * from[1] + w[1] * handle1[1] + w[2] * handle2[1] + w[3] * to[1]
    ])
  }
  return points
}
