// Miles and feet, or kilometers and meters: each person picks (saved with their account). The game and the map data
// work in meters and miles per hour; everything shown to people goes through these.

export type UnitSystem = 'imperial' | 'metric'
export const UNIT_SYSTEMS: { value: UnitSystem; label: string }[] = [
  { value: 'imperial', label: 'Miles and feet' },
  { value: 'metric', label: 'Kilometers and meters' }
]
export const DEFAULT_UNITS: UnitSystem = 'imperial' // the railroads are American, and the game posts limits in mph
export const isUnitSystem = (value: unknown): value is UnitSystem => value === 'imperial' || value === 'metric'

const FOOT = 0.3048
const MILE = 1609.344
const KMH_PER_MPH = 1.609344

const thousands = (n: number) => Math.round(n).toLocaleString('en-US')

// A distance along the track or across the map: "450 ft", "1.2 mi"; "450 m", "1.2 km".
export function formatDistance(meters: number, units: UnitSystem) {
  if (units === 'metric') return meters < 950 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`
  return meters < 0.1 * MILE ? `${Math.round(meters / FOOT / 10) * 10} ft` : `${(meters / MILE).toFixed(1)} mi`
}

// A height above sea level: "2,119 ft"; "646 m".
export const formatHeight = (meters: number, units: UnitSystem) =>
  units === 'metric' ? `${thousands(meters)} m` : `${thousands(meters / FOOT)} ft`
export const heightValue = (meters: number, units: UnitSystem) => (units === 'metric' ? meters : meters / FOOT)
export const heightUnit = (units: UnitSystem) => (units === 'metric' ? 'm' : 'ft')

// A speed, from the game's mph: "31 mph"; "50 km/h".
export const speedValue = (mph: number, units: UnitSystem) => Math.round(units === 'metric' ? mph * KMH_PER_MPH : mph)
export const speedUnit = (units: UnitSystem) => (units === 'metric' ? 'km/h' : 'mph')
export const formatSpeed = (mph: number, units: UnitSystem) => `${speedValue(mph, units)} ${speedUnit(units)}`

// The long unit for distances along a route ("mi" or "km") and how many meters are in one.
export const routeUnit = (units: UnitSystem) => (units === 'metric' ? { label: 'km', meters: 1000 } : { label: 'mi', meters: MILE })

// Lengths for a scale bar, in meters, each a round number in the person's units, with its label.
export function scaleSteps(units: UnitSystem): { meters: number; label: string }[] {
  if (units === 'metric') {
    return [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].map((m) => ({ meters: m, label: m >= 1000 ? `${m / 1000} km` : `${m} m` }))
  }
  const feet = [20, 50, 100, 200, 500, 1000, 2000].map((ft) => ({ meters: ft * FOOT, label: `${thousands(ft)} ft` }))
  const miles = [0.5, 1, 2, 5, 10].map((mi) => ({ meters: mi * MILE, label: `${mi} mi` }))
  return [...feet, ...miles]
}
