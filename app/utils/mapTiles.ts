// The real-world map under the track. Tiles come from the dashboard's own /map-tiles route.
// Each tile is placed by converting its corners from latitude/longitude to game coordinates, so tiles line up
// with each other and with the track across the whole railroad, however far it stretches.

type Ctx = CanvasRenderingContext2D
type Projector = ReturnType<typeof projector>

const MAX_CACHED = 400 // tiles kept in memory
const PARENT_LEVELS = 4 // how many zoom levels up to look for a stand-in while a tile loads

const RETRY_AFTER_MS = [2_000, 8_000, 30_000] // a tile that fails is tried again after these waits, then left blank

interface Entry {
  image: HTMLImageElement
  failures: number
  retryAt: number // when a failed tile may be asked for again (0 while loading or loaded)
}

// Loads tiles and remembers them, calling `onLoad` when one arrives so the map can redraw. A tile that fails to
// load (a busy server, a dropped connection) is tried again a few times instead of leaving a permanent gap.
export class TileCache {
  private entries = new Map<string, Entry>()
  constructor(private onLoad: () => void) {}

  // The tile's image if it has loaded; otherwise starts loading it and returns undefined.
  // With `load` false it only looks (used for stand-in tiles from lower zooms).
  get(url: string, load = true): HTMLImageElement | undefined {
    const entry = this.entries.get(url)
    if (entry) {
      // Most recently used last, so the oldest are dropped first.
      this.entries.delete(url)
      this.entries.set(url, entry)
      if (entry.image.complete && entry.image.naturalWidth) return entry.image
      if (load && entry.retryAt && Date.now() >= entry.retryAt) this.load(url, entry.failures)
      return undefined
    }
    if (load) this.load(url, 0)
    return undefined
  }

  private load(url: string, failures: number) {
    const entry: Entry = { image: new Image(), failures, retryAt: 0 }
    entry.image.decoding = 'async'
    entry.image.onload = this.onLoad
    entry.image.onerror = () => {
      entry.failures++
      const wait = RETRY_AFTER_MS[entry.failures - 1]
      if (wait === undefined) return // given up: stays blank until the page is reloaded
      entry.retryAt = Date.now() + wait
      // Redraw once the wait is over, so the retry happens even if nobody moves the map.
      setTimeout(this.onLoad, wait + 50)
    }
    entry.image.src = url
    this.entries.set(url, entry)
    if (this.entries.size > MAX_CACHED) this.entries.delete(this.entries.keys().next().value!)
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
