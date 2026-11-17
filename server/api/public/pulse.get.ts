// Public on purpose: the sign-in page shows what's running before anyone signs in. See shared/types/pulse.ts for
// what's included and what's left out. Off when an admin turns the live sign-in background off.
export default defineEventHandler(async (event): Promise<Pulse> => {
  const site = await loadSite()
  if (!site.loginLive) throw createError({ statusCode: 404, statusMessage: 'The live sign-in background is turned off' })

  const staleAfter = Number(useRuntimeConfig(event).staleAfterSec)
  const fresh = <T>(reports: { stored: StoredReport<T>; stale: boolean }[]) => reports.filter((r) => !r.stale).map((r) => r.stored.data)
  const [run8, railroader, trainReports, signalReports, layoutReports, map] = await Promise.all([
    latestReports<Run8Status>('run8', 'status', staleAfter),
    latestReports<RailroaderStatus>('railroader', 'status', staleAfter),
    latestReports<RailroaderTrains>('railroader', 'trains', staleAfter),
    latestReports<RailroaderSignals>('railroader', 'signals', staleAfter),
    // The layout is sent rarely, so it never counts as stale (as on the live map).
    latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity),
    useStorage('assets:server').getItem<MapData>('map.json')
  ])
  if (!map) throw createError({ statusCode: 404, statusMessage: 'Map data not found' })

  const routes = fresh(run8).flatMap((s) => s.routes.filter((r) => r.status === 'online'))
  const sessions = fresh(railroader).filter((s) => s.railroader.api?.sessionState === 'active')
  const games: PulseGame[] = [
    { game: 'run8', name: 'Run8', up: routes.length > 0, detail: `${routes.length} ${routes.length === 1 ? 'route' : 'routes'} running` },
    { game: 'railroader', name: 'Railroader', up: sessions.length > 0, detail: sessions[0]?.railroader.api?.railroadName || 'Session running' }
  ]

  const placeOf = (x: number, z: number): PulsePlace => ({ ...outlinePercent(map.bounds, x, z), near: nearestTown(map, x, z) })
  const trains = fresh(trainReports).flatMap((r) => r.trains).map((t): PulseTrain => ({
    id: t.id, name: t.name, speedMph: Math.round(t.speedMph), cars: t.cars, ...placeOf(t.x, t.z)
  }))

  const aspects: Record<string, SignalAspect> = Object.assign({}, ...fresh(signalReports).map((r) => r.aspects))
  const signals = layoutReports.flatMap(({ stored }) => stored.data.signals)
    .filter((s) => s.name && !s.intermediate && aspects[s.id])
    .map((s): PulseSignal => ({ id: s.id, name: s.name, aspect: aspects[s.id]!, ...placeOf(s.x, s.z) }))

  // Short, so a page left open stays current without every visitor reading the database each time.
  setHeader(event, 'Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
  return { games, trains, signals }
})

function nearestTown(map: MapData, x: number, z: number) {
  const dist = (area: MapArea) => Math.hypot(area.x - x, area.z - z)
  return map.areas.reduce<MapArea | undefined>((best, area) => (!best || dist(area) < dist(best) ? area : best), undefined)?.name ?? 'the railroad'
}
