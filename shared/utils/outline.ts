// The railroad drawn as line art for the sign-in page: public/railroad-outline.svg, made by
// scripts/build-outline.mjs from the map data. North is up. The drawing is OUTLINE_WIDTH wide, as tall as the map's
// bounds make it, with OUTLINE_MARGIN around it.

export const OUTLINE_WIDTH = 1000
export const OUTLINE_MARGIN = 20

type Bounds = [number, number, number, number] // minX, minZ, maxX, maxZ, as in the map data

export function outlineFrame([minX, minZ, maxX, maxZ]: Bounds) {
  const scale = OUTLINE_WIDTH / (maxX - minX)
  const height = (maxZ - minZ) * scale
  return { scale, height, viewBox: [-OUTLINE_MARGIN, -OUTLINE_MARGIN, OUTLINE_WIDTH + 2 * OUTLINE_MARGIN, height + 2 * OUTLINE_MARGIN] }
}

// Where a point of the map sits on the drawing, in percent of the whole image (margin included) from its left and top.
export function outlinePercent(bounds: Bounds, x: number, z: number) {
  const { scale, height } = outlineFrame(bounds)
  const [minX, , , maxZ] = bounds
  return {
    left: ((OUTLINE_MARGIN + (x - minX) * scale) / (OUTLINE_WIDTH + 2 * OUTLINE_MARGIN)) * 100,
    top: ((OUTLINE_MARGIN + (maxZ - z) * scale) / (height + 2 * OUTLINE_MARGIN)) * 100
  }
}
