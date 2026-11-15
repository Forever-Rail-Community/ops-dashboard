// Where the Railroader world sits on the real Earth, so a real map can be drawn under the track.
//
// The game's world is the real line at almost exactly 1:1, with north up: fitting it to real positions gives a
// scale within 1% and a rotation under 0.1°. It is not an exact copy everywhere, though: the depots below land
// 50–170 m from where a single straight fit puts them, so the real map can sit that far off the drawn track.
// The fit is a similarity (move, turn, scale) through these points, which are depots on the track itself.
// To improve it, add more points spread along the line (positions of the same feature in the game and in reality).

export interface GeoPoint {
  lat: number
  lon: number
}

interface ControlPoint {
  name: string
  game: [number, number] // x (east), z (north) in the game, from server/assets/map.json
  real: GeoPoint
  source: string
}

export const GEO_CONTROL_POINTS: ControlPoint[] = [
  { name: 'Bryson City depot', game: [4552.8, 5420.2], real: { lat: 35.4304766, lon: -83.4468985 }, source: 'OpenStreetMap node 10707931932' },
  { name: 'Andrews depot', game: [-29936.2, -20070.9], real: { lat: 35.2021108, lon: -83.825348 }, source: 'OpenStreetMap way 1199331703' },
  { name: 'Almond depot', game: [-6337.8, -1307.9], real: { lat: 35.368469, lon: -83.5644361 }, source: 'OpenStreetMap way 1567649685' }
]

const EARTH_RADIUS = 6_371_000
const RAD = Math.PI / 180

// Real positions as meters east and north of the points' average, which is flat enough over this area.
const LAT0 = GEO_CONTROL_POINTS.reduce((sum, p) => sum + p.real.lat, 0) / GEO_CONTROL_POINTS.length
const LON0 = GEO_CONTROL_POINTS.reduce((sum, p) => sum + p.real.lon, 0) / GEO_CONTROL_POINTS.length
const M_PER_DEG_LAT = EARTH_RADIUS * RAD
const M_PER_DEG_LON = M_PER_DEG_LAT * Math.cos(LAT0 * RAD)

const toMeters = ({ lat, lon }: GeoPoint): [number, number] => [(lon - LON0) * M_PER_DEG_LON, (lat - LAT0) * M_PER_DEG_LAT]

// Least-squares similarity from game (x, z) to real meters: real = scale·rotate(game) + shift.
// Written as complex numbers: w = a·g + b, with a = (ar, ai).
const FIT = (() => {
  const n = GEO_CONTROL_POINTS.length
  const g = GEO_CONTROL_POINTS.map((p) => p.game)
  const w = GEO_CONTROL_POINTS.map((p) => toMeters(p.real))
  const gx = g.reduce((s, q) => s + q[0], 0) / n
  const gz = g.reduce((s, q) => s + q[1], 0) / n
  const wx = w.reduce((s, q) => s + q[0], 0) / n
  const wz = w.reduce((s, q) => s + q[1], 0) / n
  let re = 0
  let im = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const [dgx, dgz] = [g[i]![0] - gx, g[i]![1] - gz]
    const [dwx, dwz] = [w[i]![0] - wx, w[i]![1] - wz]
    re += dwx * dgx + dwz * dgz
    im += dwz * dgx - dwx * dgz
    den += dgx * dgx + dgz * dgz
  }
  const ar = re / den
  const ai = im / den
  return { ar, ai, bx: wx - (ar * gx - ai * gz), bz: wz - (ai * gx + ar * gz) }
})()

// How many real meters one game meter is (very close to 1).
export const GEO_SCALE = Math.hypot(FIT.ar, FIT.ai)

export function gameToGeo(x: number, z: number): GeoPoint {
  const east = FIT.ar * x - FIT.ai * z + FIT.bx
  const north = FIT.ai * x + FIT.ar * z + FIT.bz
  return { lat: LAT0 + north / M_PER_DEG_LAT, lon: LON0 + east / M_PER_DEG_LON }
}

export function geoToGame(point: GeoPoint): [number, number] {
  const [east, north] = toMeters(point)
  const dx = east - FIT.bx
  const dz = north - FIT.bz
  const d = FIT.ar * FIT.ar + FIT.ai * FIT.ai
  return [(FIT.ar * dx + FIT.ai * dz) / d, (FIT.ar * dz - FIT.ai * dx) / d]
}

// ---- Web map tiles (the standard "slippy map" numbering: zoom z, column x, row y) ----

export const TILE_MIN_ZOOM = 7
export const TILE_MAX_ZOOM = 19
export const TILE_STYLES = ['light_all', 'dark_all'] as const
export type TileStyle = (typeof TILE_STYLES)[number]

export const lonToTileX = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z
export const latToTileY = (lat: number, z: number) =>
  ((1 - Math.log(Math.tan(lat * RAD) + 1 / Math.cos(lat * RAD)) / Math.PI) / 2) * 2 ** z
export const tileXToLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180
export const tileYToLat = (y: number, z: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / RAD

// Meters across one tile pixel (256 per tile) at this zoom, around the railroad.
export const tileMetersPerPixel = (z: number) => (2 * Math.PI * EARTH_RADIUS * Math.cos(LAT0 * RAD)) / (256 * 2 ** z)

// The tiles covering a game-coordinate box at zoom z, as inclusive column and row ranges.
export function tilesCovering(box: [number, number, number, number], z: number) {
  const corners = [gameToGeo(box[0], box[1]), gameToGeo(box[0], box[3]), gameToGeo(box[2], box[1]), gameToGeo(box[2], box[3])]
  const xs = corners.map((c) => Math.floor(lonToTileX(c.lon, z)))
  const ys = corners.map((c) => Math.floor(latToTileY(c.lat, z)))
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}
