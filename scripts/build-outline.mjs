// Draws the railroad as line art for the sign-in page, from the map data the dashboard already has.
//   node scripts/build-outline.mjs
// Reads server/assets/map.json and writes public/railroad-outline.svg. Run it after build-map.mjs whenever the map
// changes. Needs Node.js 22.18 or newer (it loads the map's TypeScript curve code directly).
//
// The drawing is public (anyone can open the sign-in page), so it holds only the shape of the track: no ids, names,
// speeds or heights.
import { readFileSync, writeFileSync } from 'node:fs'
import { curveBetween, flatten } from '../app/utils/mapCurve.ts'
import { outlineFrame } from '../shared/utils/outline.ts'

const map = JSON.parse(readFileSync(new URL('../server/assets/map.json', import.meta.url), 'utf8'))
const { scale, viewBox } = outlineFrame(map.bounds)
const [minX, , , maxZ] = map.bounds
const MIN_STEP = 1.5 // in drawing units; finer detail than this can't be seen at the sizes the page shows it

const fmt = (n) => (Math.round(n * 10) / 10).toString()
const parts = map.segments.map(([a, b]) => {
  const points = flatten(curveBetween(map, a, b), 8).map(([x, z]) => [(x - minX) * scale, (maxZ - z) * scale])
  const kept = [points[0]]
  for (const p of points.slice(1)) {
    const last = kept.at(-1)
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= MIN_STEP) kept.push(p)
  }
  if (kept.length === 1) kept.push(points.at(-1)) // always draw the piece, however short
  return 'M' + kept.map(([x, y]) => `${fmt(x)} ${fmt(y)}`).join('L')
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.map(fmt).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${parts.join('')}"/></svg>\n`
const out = new URL('../public/railroad-outline.svg', import.meta.url)
writeFileSync(out, svg)
console.log(`Wrote public/railroad-outline.svg: ${map.segments.length} pieces, ${Math.round(svg.length / 1024)} KB`)
