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

  // A named place has a signal for each track and direction ("Alarka Junction East" can be three signals). It's
  // shown once, with its most open aspect: a card then says a route is lined there, not one head of several.
  const aspects: Record<string, SignalAspect> = Object.assign({}, ...fresh(signalReports).map((r) => r.aspects))
  const byName = new Map<string, PulseSignal>()
  for (const s of layoutReports.flatMap(({ stored }) => stored.data.signals)) {
    const aspect = aspects[s.id]
    if (!s.name || s.intermediate || !aspect) continue
    const seen = byName.get(s.name)
    if (!seen) byName.set(s.name, { id: s.name, name: s.name, aspect, ...placeOf(s.x, s.z) })
    else if (OPENNESS.indexOf(aspect) > OPENNESS.indexOf(seen.aspect)) seen.aspect = aspect
  }
  const signals = [...byName.values()]

  // Short, so a page left open stays current without every visitor reading the database each time.
  setHeader(event, 'Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10')
  return { games, trains, signals }
})

// From least to most open.
const OPENNESS: SignalAspect[] = ['unknown', 'stop', 'restricting', 'divergingApproach', 'approach', 'divergingClear', 'clear']
