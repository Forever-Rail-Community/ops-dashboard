// The map data is the game's own track layout, so it is only sent to signed-in people with map access.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'map.view')

  const map = await useStorage('assets:server').getItem('map.json')
  if (!map) throw createError({ statusCode: 404, statusMessage: 'Map data not found' })

  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return map
})
