// Everything about how the map is styled and labeled, in one place.

export const SPEED_COLORS: Record<number, string> = { 0: '#71717a', 15: '#dc2626', 25: '#ea580c', 30: '#ca8a04', 45: '#16a34a' }
export const speedColor = (limit: number) => SPEED_COLORS[limit] ?? SPEED_COLORS[0]!

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
