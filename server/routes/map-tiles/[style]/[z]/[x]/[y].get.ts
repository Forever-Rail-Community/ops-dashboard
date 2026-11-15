// Real-world map tiles for the Railroader map's background, fetched from CARTO with the server's key.
// Going through here keeps the key private and lets the CDN cache each tile, so CARTO sees far fewer requests.
// It is public (tiles are not game data) but only serves tiles around the railroad, so it can't be used as a
// general map server on our key.
const MARGIN = 5_000 // game meters beyond the track's bounds that still get tiles
const CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'

let bounds: MapData['bounds'] | undefined

export default defineEventHandler(async (event) => {
  const key = useRuntimeConfig(event).cartoKey
  if (!key) throw createError({ statusCode: 404, statusMessage: 'The map background is not set up (NUXT_CARTO_KEY)' })

  const style = getRouterParam(event, 'style') as TileStyle
  const [z, x, y] = ['z', 'x', 'y'].map((name) => Number(getRouterParam(event, name)))
  if (!TILE_STYLES.includes(style) || ![z, x, y].every(Number.isInteger) || z! < TILE_MIN_ZOOM || z! > TILE_MAX_ZOOM) {
    throw createError({ statusCode: 400, statusMessage: 'Not a map tile' })
  }

  bounds ??= (await useStorage('assets:server').getItem<MapData>('map.json'))?.bounds
  if (!bounds) throw createError({ statusCode: 404, statusMessage: 'Map data not found' })
  const [bx0, bz0, bx1, bz1] = bounds
  const range = tilesCovering([bx0 - MARGIN, bz0 - MARGIN, bx1 + MARGIN, bz1 + MARGIN], z!)
  if (x! < range.x0 || x! > range.x1 || y! < range.y0 || y! > range.y1) {
    throw createError({ statusCode: 404, statusMessage: 'Outside the railroad' })
  }

  // The tile source. To use another provider, change this URL (and the credit shown under the map).
  const server = 'abcd'[(x! + y!) % 4]
  const res = await fetch(`https://${server}.basemaps.cartocdn.com/${style}/${z}/${x}/${y}@2x.png?key=${encodeURIComponent(key)}`)
  if (!res.ok) throw createError({ statusCode: 502, statusMessage: `Map tiles unavailable (${res.status})` })

  setHeader(event, 'Content-Type', res.headers.get('content-type') ?? 'image/png')
  setHeader(event, 'Cache-Control', CACHE)
  return new Uint8Array(await res.arrayBuffer())
})
