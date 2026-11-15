// The real-world map under the track. Tiles come from the dashboard's own /map-tiles route.
// Each tile is placed by converting its corners from latitude/longitude to game coordinates, so tiles line up
// with each other and with the track across the whole railroad, however far it stretches.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

const MAX_CACHED = 400 // tiles kept in memory
const PARENT_LEVELS = 4 // how many zoom levels up to look for a stand-in while a tile loads

// Loads tiles once and remembers them, calling `onLoad` when one arrives so the map can redraw.
export class TileCache {
  private images = new Map<string, HTMLImageElement>()
  constructor(private onLoad: () => void) {}

  // The tile's image if it has loaded; otherwise starts loading it (once) and returns undefined.
  get(url: string, load = true): HTMLImageElement | undefined {
    const image = this.images.get(url)
    if (image) {
      // Most recently used last, so the oldest are dropped first.
      this.images.delete(url)
      this.images.set(url, image)
      return image.complete && image.naturalWidth ? image : undefined
    }
    if (!load) return undefined
    const next = new Image()
    next.decoding = 'async'
    next.onload = this.onLoad
    next.src = url
    this.images.set(url, next)
    if (this.images.size > MAX_CACHED) this.images.delete(this.images.keys().next().value!)
    return undefined
  }
}

const tileUrl = (style: TileStyle, z: number, x: number, y: number) => `/map-tiles/${style}/${z}/${x}/${y}`

// The tile zoom whose pixels best match the screen's (tiles are fetched at double resolution).
function tileZoom(view: MapViewState) {
  const metersPerScreenPixel = GEO_SCALE / view.s
  const z = Math.round(Math.log2(tileMetersPerPixel(0) / metersPerScreenPixel))
  return Math.min(TILE_MAX_ZOOM, Math.max(TILE_MIN_ZOOM, z))
}

// Screen position of a tile corner (tile numbers can be fractional).
function cornerOnScreen(p: Projector, x: number, y: number, z: number): Point {
  const [gx, gz] = geoToGame({ lat: tileYToLat(y, z), lon: tileXToLon(x, z) })
  return [p.x(gx), p.y(gz)]
}

export function drawBackground(ctx: Ctx, map: MapData, view: MapViewState, p: Projector, style: TileStyle, tiles: TileCache) {
  const z = tileZoom(view)
  const box: [number, number, number, number] = [p.worldX(0), p.worldZ(view.h), p.worldX(view.w), p.worldZ(0)]
  // Only the tiles the dashboard serves (around the railroad) are asked for.
  const onScreen = tilesCovering(box, z)
  const served = railroadTiles(map.bounds, z)
  const x0 = Math.max(onScreen.x0, served.x0)
  const x1 = Math.min(onScreen.x1, served.x1)
  const y0 = Math.max(onScreen.y0, served.y0)
  const y1 = Math.min(onScreen.y1, served.y1)

  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      // Rounded outward by half a pixel so neighboring tiles leave no hairline gaps.
      const [ax, ay] = cornerOnScreen(p, x, y, z)
      const [bx, by] = cornerOnScreen(p, x + 1, y + 1, z)
      const dx = Math.floor(ax) - 0.5
      const dy = Math.floor(ay) - 0.5
      const dw = Math.ceil(bx) - dx + 0.5
      const dh = Math.ceil(by) - dy + 0.5

      const image = tiles.get(tileUrl(style, z, x, y))
      if (image) {
        ctx.drawImage(image, dx, dy, dw, dh)
        continue
      }
      // Not loaded yet: stretch the matching part of an already-loaded tile from a lower zoom.
      for (let up = 1; up <= PARENT_LEVELS && z - up >= TILE_MIN_ZOOM; up++) {
        const parent = tiles.get(tileUrl(style, z - up, x >> up, y >> up), false)
        if (!parent) continue
        const part = parent.naturalWidth / 2 ** up
        ctx.drawImage(parent, (x % 2 ** up) * part, (y % 2 ** up) * part, part, part, dx, dy, dw, dh)
        break
      }
    }
  }
  ctx.restore()
}
