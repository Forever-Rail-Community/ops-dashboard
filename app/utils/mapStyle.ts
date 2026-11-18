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
  switch: string // a switch that can't show which way it's lined
  industry: Record<IndustryType, string> // industry markers and highlighted track, by main type (passenger: the diamonds)
  marker: string // the ring on town dots
  outline: string // ring around markers (and the fill of town dots)
  speeds: Record<number, string> // by speed limit; 0 is the fallback
  train: string // live trains: filled when moving, outlined when stopped
  onTrain: string // text on a moving train's tag
  tiles: TileStyle // the real-world map's style
  aspects: Record<SignalAspect, string> // a signal's lamp, by aspect
  occupied: string // the band along an occupied block's track
  climbs: [string, string, string, string] // by gradeClass, level to steep: climbing, and the grade layer
  descents: [string, string, string, string] // by gradeClass: descending
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
  industry: { passenger: '#1d4ed8', repair: '#db2777', interchange: '#4d7c0f', loads: '#0f766e', unloads: '#b45309', team: '#52525b', other: '#71717a' },
  marker: '#18181b',
  outline: '#ffffff',
  speeds: { 0: '#71717a', 15: '#dc2626', 25: '#ea580c', 30: '#ca8a04', 45: '#16a34a' },
  train: '#7c3aed',
  onTrain: '#ffffff',
  tiles: 'light_all',
  aspects: { stop: '#dc2626', approach: '#ca8a04', divergingApproach: '#ca8a04', clear: '#16a34a', divergingClear: '#16a34a', restricting: '#ea580c', unknown: '#71717a' },
  occupied: '#dc2626',
  climbs: ['#71717a', '#d97706', '#ea580c', '#dc2626'],
  descents: ['#71717a', '#0284c7', '#2563eb', '#7c3aed']
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
  industry: { passenger: '#60a5fa', repair: '#f472b6', interchange: '#a3e635', loads: '#2dd4bf', unloads: '#fbbf24', team: '#a1a1aa', other: '#71717a' },
  marker: '#e4e4e7',
  outline: '#18181b',
  speeds: { 0: '#a1a1aa', 15: '#f87171', 25: '#fb923c', 30: '#facc15', 45: '#4ade80' },
  train: '#a78bfa',
  onTrain: '#1e1036',
  tiles: 'dark_all',
  aspects: { stop: '#f87171', approach: '#facc15', divergingApproach: '#facc15', clear: '#4ade80', divergingClear: '#4ade80', restricting: '#fb923c', unknown: '#a1a1aa' },
  occupied: '#f87171',
  climbs: ['#a1a1aa', '#fbbf24', '#fb923c', '#f87171'],
  descents: ['#a1a1aa', '#38bdf8', '#60a5fa', '#a78bfa']
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
  grade: false,
  switches: true,
  places: true,
  industries: true,
  stops: true,
  turntables: true,
  trains: true,
  signals: true
}

// An industry's main type, which decides its color and group: the first of these it has.
export type IndustryType = IndustryKind | 'other'
export const INDUSTRY_TYPES: IndustryType[] = ['passenger', 'repair', 'interchange', 'loads', 'unloads', 'team', 'other']
export const industryType = (industry: MapIndustry): IndustryType => INDUSTRY_TYPES.find((t) => industry.kinds.includes(t as IndustryKind)) ?? 'other'

// Group names, and short names for chips and tags.
export const INDUSTRY_TYPE_TEXT: Record<IndustryType, { group: string; short: string }> = {
  passenger: { group: 'Passenger', short: 'Passenger' },
  repair: { group: 'Engine service and repair', short: 'Repair' },
  interchange: { group: 'Interchange', short: 'Interchange' },
  loads: { group: 'Loads cars', short: 'Loads' },
  unloads: { group: 'Unloads cars', short: 'Unloads' },
  team: { group: 'Team track', short: 'Team track' },
  other: { group: 'Other', short: 'Other' }
}

// What else an industry does, besides its main type, in plain words ("Also unloads").
export function industryAlso(industry: MapIndustry) {
  const main = industryType(industry)
  const rest = industry.kinds.filter((k) => k !== main).map((k) => KIND_TEXT[k].toLowerCase())
  return rest.length ? `Also ${rest.join(' and ')}` : ''
}

// The map key: one row per layer, with its on/off box and symbol, and what its symbols mean listed under it.
// Track speed limits are listed by the key itself, since they come from the map data.
export interface MapKeyRow {
  layer: keyof MapLayers
  label: string
  symbol?: MapSymbol
  items?: { symbol: MapSymbol; label: string; industryType?: IndustryType }[] // industryType colors the symbol
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
      { symbol: 'switchLined', label: 'Lined route solid, other way open' },
      { symbol: 'switch', label: 'Not reported' }
    ]
  },
  {
    layer: 'signals',
    label: 'Signals (zoom in)',
    items: [
      { symbol: 'signalClear', label: 'Clear (or diverging clear)' },
      { symbol: 'signalApproach', label: 'Approach (or diverging approach)' },
      { symbol: 'signalStop', label: 'Stop' },
      { symbol: 'signalRestricting', label: 'Restricting' },
      { symbol: 'blockOccupied', label: 'Occupied block' }
    ]
  },
  { layer: 'speed', label: 'Color track by speed limit' },
  { layer: 'grade', label: 'Color track by steepness' },
  { layer: 'background', label: 'Real-world map underneath' },
  { layer: 'places', label: 'Towns', symbol: 'place' },
  {
    layer: 'industries',
    label: 'Industries, colored by what they do',
    items: (['loads', 'unloads', 'repair', 'interchange', 'team'] as const).map((t) => ({
      symbol: 'industry' as const,
      label: INDUSTRY_TYPE_TEXT[t].group,
      industryType: t
    }))
  },
  { layer: 'stops', label: 'Passenger stops', symbol: 'stop' },
  { layer: 'turntables', label: 'Turntables', symbol: 'turntable' }
]

export const isPassengerStop = (industry: MapIndustry) => industry.kinds.includes('passenger')


// Passenger stops and other industries are separate layers.
export const industryVisible = (industry: MapIndustry, layers: MapLayers) =>
  isPassengerStop(industry) ? layers.stops : layers.industries

// Switches and signals only appear once you are zoomed in this far (relative to the whole-railroad view).
const SWITCH_ZOOM = 3
export const switchesVisible = (view: MapViewState, layers: MapLayers) =>
  layers.switches && view.s / view.fit > SWITCH_ZOOM
export const signalsVisible = (view: MapViewState, layers: MapLayers) =>
  layers.signals && view.s / view.fit > SWITCH_ZOOM

export const ASPECT_TEXT: Record<SignalAspect, string> = {
  stop: 'Stop',
  approach: 'Approach',
  clear: 'Clear',
  divergingApproach: 'Diverging approach',
  divergingClear: 'Diverging clear',
  restricting: 'Restricting',
  unknown: 'Aspect not reported'
}
// "Absolute signal", "Intermediate signal", or just "Signal" from mods that don't say.
export const signalKindText = (s: SignalDef) =>
  s.intermediate === undefined ? 'Signal' : s.intermediate ? 'Intermediate signal' : 'Absolute signal'

// The way a signal's trains run, to the nearest of eight compass points ("Northbound trains"). The game's z axis
// points north (about true north). Empty when the game doesn't give a direction.
const COMPASS = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest']
export function signalFacingText(s: SignalDef) {
  if (!s.dx && !s.dz) return ''
  const degrees = (Math.atan2(s.dx, s.dz) * 180) / Math.PI // clockwise from north
  const point = COMPASS[Math.round((degrees + 360) / 45) % 8]!
  return `${point}${point.length > 5 ? '-' : ''}bound trains`
}

export const signalHit = (s: SignalDef): MapHit => ({ type: 'signal', id: s.id, name: s.name || signalKindText(s), x: s.x, z: s.z })

export const switchHit = (gameId: string, x: number, z: number): MapHit => ({ type: 'switch', id: gameId, name: 'Switch', x, z })

// A switch's position in plain words. thrown is undefined when the game hasn't reported it.
export const switchText = (thrown: boolean | undefined) =>
  thrown === undefined ? 'Position not reported' : thrown ? 'Closed: thrown to the diverging route' : 'Open: lined straight'
// A train slower than this is shown as stopped (speeds drift a little while standing).
const MOVING_MPH = 0.5
export const isMoving = (train: TrainReport) => train.speedMph >= MOVING_MPH
export const trainMotion = (speedMph: number, units: UnitSystem) => (speedMph >= MOVING_MPH ? `Moving at ${formatSpeed(speedMph, units)}` : 'Stopped')
export const trainHit = (t: TrainReport): MapHit => ({ type: 'train', id: t.id, name: t.name, x: t.x, z: t.z, speed: t.speedMph })
export const placeHit = (a: MapArea): MapHit => ({ type: 'place', id: a.id, name: a.name, x: a.x, z: a.z })
export const industryHit = (i: MapIndustry): MapHit => ({ type: 'industry', id: i.id, name: i.name, x: i.x, z: i.z })

// A small tag in an industry type's color: tinted background, colored text (the palette's colors are 6-digit hex).
export const industryTagStyle = (palette: MapPalette, type: IndustryType) => ({
  background: `${palette.industry[type]}26`,
  color: palette.industry[type]
})
