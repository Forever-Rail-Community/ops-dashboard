// Everything about how the map is styled and labeled, in one place.

// Every color the map uses, once for a light page and once for a dark one.
export interface MapPalette {
  ink: string // small labels, scale bar
  strong: string // town names
  halo: string // outline behind text so it stays readable over track
  track: string // track with no speed limit set
  turntable: string
  switch: string
  stop: string // passenger stop diamonds
  marker: string // industry dots (and the ring on town dots)
  outline: string // ring around markers (and the fill of town dots)
  speeds: Record<number, string> // by speed limit; 0 is the fallback
}

const LIGHT_PALETTE: MapPalette = {
  ink: '#27272a',
  strong: '#09090b',
  halo: 'rgba(255,255,255,0.92)',
  track: '#52525b',
  turntable: '#3f3f46',
  switch: '#2563eb',
  stop: '#1d4ed8',
  marker: '#18181b',
  outline: '#ffffff',
  speeds: { 0: '#71717a', 15: '#dc2626', 25: '#ea580c', 30: '#ca8a04', 45: '#16a34a' }
}

const DARK_PALETTE: MapPalette = {
  ink: '#e4e4e7',
  strong: '#fafafa',
  halo: 'rgba(10,10,10,0.9)',
  track: '#a1a1aa',
  turntable: '#a1a1aa',
  switch: '#60a5fa',
  stop: '#60a5fa',
  marker: '#e4e4e7',
  outline: '#18181b',
  speeds: { 0: '#a1a1aa', 15: '#f87171', 25: '#fb923c', 30: '#facc15', 45: '#4ade80' }
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
  speed: true,
  switches: true,
  places: true,
  industries: true,
  stops: true,
  turntables: true
}

export const LAYER_OPTIONS: { key: keyof MapLayers; label: string }[] = [
  { key: 'speed', label: 'Color track by speed limit' },
  { key: 'switches', label: 'Switches (zoom in)' },
  { key: 'places', label: 'Town names' },
  { key: 'industries', label: 'Industries' },
  { key: 'stops', label: 'Passenger stops' },
  { key: 'turntables', label: 'Turntables' }
]

export const isPassengerStop = (industry: MapIndustry) => industry.kinds.includes('passenger')

// Passenger stops and other industries are separate layers.
export const industryVisible = (industry: MapIndustry, layers: MapLayers) =>
  isPassengerStop(industry) ? layers.stops : layers.industries

export const placeHit = (a: MapArea): MapHit => ({ type: 'place', id: a.id, name: a.name, x: a.x, z: a.z })
export const industryHit = (i: MapIndustry): MapHit => ({ type: 'industry', id: i.id, name: i.name, x: i.x, z: i.z })
