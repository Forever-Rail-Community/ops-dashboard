// The map data is the game's own track layout, so it is only sent to signed-in people with map access.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'map.view')

  const map = await useStorage('assets:server').getItem<MapData>('map.json')
  if (!map) throw createError({ statusCode: 404, statusMessage: 'Map data not found' })
  if (map.version !== MAP_DATA_VERSION) {
    throw createError({ statusCode: 500, statusMessage: 'Map data is out of date. Run scripts/build-map.mjs and redeploy.' })
  }

  // Safe to cache: the page puts MAP_DATA_VERSION in the URL, so a new data format is a new URL.
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return map
})
