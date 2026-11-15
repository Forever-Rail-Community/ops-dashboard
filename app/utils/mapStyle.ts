// Everything about how the map is styled and labeled, in one place.

export const MAP_FONT = 'Inter Variable, system-ui, sans-serif'

// Every color the map uses, once for a light page and once for a dark one.
export interface MapPalette {
  ink: string // small labels, scale bar
  strong: string // town names
  halo: string // outline behind text so it stays readable over track
  track: string // track with no speed limit set
  ballast: string // the bed under the track when zoomed in
  tie: string // ties, when track is drawn to scale
  turntable: string
  switch: string // position not reported
  switchOpen: string // lined straight (normal)
  switchClosed: string // thrown to the diverging route
  stop: string // passenger stop diamonds
  marker: string // industry dots (and the ring on town dots)
  outline: string // ring around markers (and the fill of town dots)
  speeds: Record<number, string> // by speed limit; 0 is the fallback
  train: string // live trains: filled when moving, outlined when stopped
  onTrain: string // text on a moving train's tag
  tiles: TileStyle // the real-world map's style
}

const LIGHT_PALETTE: MapPalette = {
  ink: '#27272a',
  strong: '#09090b',
  halo: 'rgba(255,255,255,0.92)',
  track: '#52525b',
  ballast: '#e9e9ec',
  tie: '#b8b8c0',
  turntable: '#3f3f46',
  switch: '#2563eb',
  switchOpen: '#16a34a',
  switchClosed: '#dc2626',
  stop: '#1d4ed8',
  marker: '#18181b',
  outline: '#ffffff',
  speeds: { 0: '#71717a', 15: '#dc2626', 25: '#ea580c', 30: '#ca8a04', 45: '#16a34a' },
  train: '#7c3aed',
  onTrain: '#ffffff',
  tiles: 'light_all'
}

const DARK_PALETTE: MapPalette = {
  ink: '#e4e4e7',
  strong: '#fafafa',
  halo: 'rgba(10,10,10,0.9)',
  track: '#a1a1aa',
  ballast: '#2a2a2e',
  tie: '#47474e',
  turntable: '#a1a1aa',
  switch: '#60a5fa',
  switchOpen: '#4ade80',
  switchClosed: '#f87171',
  stop: '#60a5fa',
  marker: '#e4e4e7',
  outline: '#18181b',
  speeds: { 0: '#a1a1aa', 15: '#f87171', 25: '#fb923c', 30: '#facc15', 45: '#4ade80' },
  train: '#a78bfa',
  onTrain: '#1e1036',
  tiles: 'dark_all'
}

export const mapPalette = (dark: boolean): MapPalette => (dark ? DARK_PALETTE : LIGHT_PALETTE)
export const speedColor = (palette: MapPalette, limit: number) => palette.speeds[limit] ?? palette.speeds[0]!

// The distinct speed limits used on the map, lowest first (0 means none set).
export const speedLimitsIn = (map: MapData) =>
  [...new Set(map.segments.map((segment) => segment[2]))].sort((a, b) => a - b)

export const KIND_TEXT: Record<IndustryKind, string> = {
  passenger: 'Passenger stop',
  interchange: 'Interchange',
  loads: 'Loads cars',
  unloads: 'Unloads cars',
  repair: 'Repair track',
  team: 'Team track'
}

export const DEFAULT_LAYERS: MapLayers = {
  background: false,
  speed: true,
  switches: true,
  places: true,
  industries: true,
  stops: true,
  turntables: true,
  trains: true
}

// The map key: one row per layer, with its on/off box and symbol, and what its symbols mean listed under it.
// Track speed limits are listed by the key itself, since they come from the map data.
export interface MapKeyRow {
  layer: keyof MapLayers
  label: string
  symbol?: MapSymbol
  items?: { symbol: MapSymbol; label: string }[]
}

export const MAP_KEY: MapKeyRow[] = [
  {
    layer: 'trains',
    label: 'Live trains',
    items: [
      { symbol: 'trainMoving', label: 'Moving: filled tag with its speed' },
      { symbol: 'trainStopped', label: 'Stopped: outlined tag' }
    ]
  },
  {
    layer: 'switches',
    label: 'Switches (zoom in)',
    items: [
      { symbol: 'switchOpen', label: 'Open, lined straight' },
      { symbol: 'switchClosed', label: 'Closed, thrown to the diverging route' },
      { symbol: 'switch', label: 'Position not reported' }
    ]
  },
  { layer: 'speed', label: 'Color track by speed limit' },
  { layer: 'background', label: 'Real-world map underneath' },
  { layer: 'places', label: 'Towns', symbol: 'place' },
  { layer: 'industries', label: 'Industries', symbol: 'industry' },
  { layer: 'stops', label: 'Passenger stops', symbol: 'stop' },
  { layer: 'turntables', label: 'Turntables', symbol: 'turntable' }
]

export const isPassengerStop = (industry: MapIndustry) => industry.kinds.includes('passenger')

// Passenger stops and other industries are separate layers.
export const industryVisible = (industry: MapIndustry, layers: MapLayers) =>
  isPassengerStop(industry) ? layers.stops : layers.industries

// Switches only appear once you are zoomed in this far (relative to the whole-railroad view).
const SWITCH_ZOOM = 3
export const switchesVisible = (view: MapViewState, layers: MapLayers) =>
  layers.switches && view.s / view.fit > SWITCH_ZOOM

export const switchHit = (gameId: string, x: number, z: number): MapHit => ({ type: 'switch', id: gameId, name: 'Switch', x, z })

// A switch's position in plain words, and its symbol. thrown is undefined when the game hasn't reported it.
export const switchSymbol = (thrown: boolean | undefined): MapSymbol =>
  thrown === undefined ? 'switch' : thrown ? 'switchClosed' : 'switchOpen'
export const switchText = (thrown: boolean | undefined) =>
  thrown === undefined ? 'Position not reported' : thrown ? 'Closed: thrown to the diverging route' : 'Open: lined straight'
// A train slower than this is shown as stopped (speeds drift a little while standing).
const MOVING_MPH = 0.5
export const isMoving = (train: TrainReport) => train.speedMph >= MOVING_MPH
export const trainMotion = (speedMph: number) => (speedMph >= MOVING_MPH ? `Moving at ${Math.round(speedMph)} mph` : 'Stopped')
export const trainHit = (t: TrainReport): MapHit => ({ type: 'train', id: t.id, name: t.name, x: t.x, z: t.z, speed: t.speedMph })
export const placeHit = (a: MapArea): MapHit => ({ type: 'place', id: a.id, name: a.name, x: a.x, z: a.z })
export const industryHit = (i: MapIndustry): MapHit => ({ type: 'industry', id: i.id, name: i.name, x: i.x, z: i.z })
