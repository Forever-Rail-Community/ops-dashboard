// Turns Railroader's Map.json into the compact file the dashboard's map page reads.
//   node scripts/build-map.mjs path/to/Map.json
// Writes server/assets/map.json. Run it again after a game update to refresh the map.
//
// What is kept: track points and pieces (with posted speed limits), switches (points where three pieces meet),
// named areas, industries (with what they do), passenger stops and turntables.
// Coordinates are the game's own: x runs east, z runs north. Units are assumed to be meters.
// Each node also keeps its heading (yaw, degrees clockwise from north): the direction the track runs through it.
// The dashboard uses it to draw track pieces as curves instead of straight lines.

import { readFile, writeFile } from 'node:fs/promises'

const input = process.argv[2]
if (!input) {
  console.error('Usage: node scripts/build-map.mjs path/to/Map.json')
  process.exit(1)
}

const src = JSON.parse(await readFile(input, 'utf8'))
const round = (n) => Math.round(n * 10) / 10

const nodeIds = Object.keys(src.graph.nodes)
const index = new Map(nodeIds.map((id, i) => [id, i]))
const nodes = nodeIds.map((id) => {
  const { position: [x, , z], rotation } = src.graph.nodes[id]
  return [round(x), round(z), round(rotation[1])]
})

const degree = new Array(nodes.length).fill(0)
const segments = []
for (const s of Object.values(src.graph.segments)) {
  const a = index.get(s.a)
  const b = index.get(s.b)
  if (a === undefined || b === undefined) continue
  degree[a]++
  degree[b]++
  segments.push([a, b, s.speedLimit ?? 0])
}
const switches = degree.flatMap((d, i) => (d === 3 ? [i] : []))

// Plain-language labels for what an industry's components do. Derived from the component names in the file.
const KIND = {
  PassengerStop: 'passenger',
  Interchange: 'interchange',
  IndustryLoader: 'loads',
  InterchangedIndustryLoader: 'loads',
  StorageLoader: 'loads',
  IndustryUnloader: 'unloads',
  StorageUnloader: 'unloads',
  RepairTrack: 'repair',
  TeamTrack: 'team'
}

const areas = []
const industries = []
for (const [areaId, area] of Object.entries(src.ops.areas)) {
  areas.push({ id: areaId, name: area.name, x: round(area.position[0]), z: round(area.position[2]), r: area.radius })
  for (const [id, ind] of Object.entries(area.industries ?? {})) {
    const kinds = [...new Set(Object.values(ind.components ?? {}).map((c) => KIND[c.kind]).filter(Boolean))]
    industries.push({ id, name: ind.name, area: areaId, x: round(ind.position[0]), z: round(ind.position[2]), kinds })
  }
}

// A turntable is a ring of stall positions around a pit. Its bridge runs from the default stall to the one opposite it.
const turntables = Object.entries(src.graph.turntables ?? {}).map(([id, t]) => {
  const at = (n) => src.graph.nodes[t.nodeIds[n % t.nodeIds.length]].position
  const from = at(t.defaultStopIndex)
  const to = at(t.defaultStopIndex + t.nodeIds.length / 2)
  return { id, x: round(t.position[0]), z: round(t.position[2]), r: t.radius, bridge: [round(from[0]), round(from[2]), round(to[0]), round(to[2])] }
})

const xs = nodes.map((n) => n[0])
const zs = nodes.map((n) => n[1])
const out = {
  version: 1,
  bounds: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
  nodes, segments, switches, areas, industries, turntables
}

await writeFile(new URL('../server/assets/map.json', import.meta.url), JSON.stringify(out))
console.log(`nodes ${nodes.length}, segments ${segments.length}, switches ${switches.length}, areas ${areas.length}, industries ${industries.length}, turntables ${turntables.length}`)
