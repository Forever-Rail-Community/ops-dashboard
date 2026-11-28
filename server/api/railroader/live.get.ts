// What moves on the Railroader map and the CTC board: the latest trains, switch positions and signals from each
// Railroader server.
export default defineEventHandler(async (event): Promise<LiveResponse> => {
  await requirePermission(event, ['map.view', 'ctc.view'])
  await markWatching('railroader')
  const staleAfter = Number(useRuntimeConfig(event).staleAfterSec)
  const [trainReports, switchReports, industryReports, signalReports, layoutReports] = await Promise.all([
    latestReports<RailroaderTrains>('railroader', 'trains', staleAfter),
    latestReports<RailroaderSwitches>('railroader', 'switches', staleAfter),
    latestReports<RailroaderIndustries>('railroader', 'industries', staleAfter),
    latestReports<RailroaderSignals>('railroader', 'signals', staleAfter),
    // The layout is sent rarely (when signals are built, and every 10 minutes), so it never counts as stale here.
    latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  ])

  const ageOf = (reports: { ageSec: number; stale: boolean }[]): ReportAge => ({
    ageSec: reports.length ? Math.min(...reports.map((r) => r.ageSec)) : null,
    stale: reports.length > 0 && reports.every((r) => r.stale)
  })

  return {
    trains: trainReports.flatMap(({ stored }) => stored.data.trains.map((t) => ({ ...t, agentId: stored.agentId }))),
    trainsAge: ageOf(trainReports),
    switches: Object.assign({}, ...switchReports.map(({ stored }) => stored.data.thrown)),
    switchesAge: ageOf(switchReports),
    industries: {
      cars: Object.assign({}, ...industryReports.map(({ stored }) => stored.data.cars)),
      passengers: Object.assign({}, ...industryReports.map(({ stored }) => stored.data.passengers))
    },
    industriesAge: ageOf(industryReports),
    signals: {
      aspects: Object.assign({}, ...signalReports.map(({ stored }) => stored.data.aspects)),
      occupied: Object.assign({}, ...signalReports.map(({ stored }) => stored.data.occupied)),
      released: Object.assign({}, ...signalReports.map(({ stored }) => stored.data.released ?? {})) // older reports have none
    },
    signalsAge: ageOf(signalReports),
    signalLayoutVersion: layoutReports.length ? Math.max(...layoutReports.map(({ stored }) => stored.receivedAt)) : null
  }
})
