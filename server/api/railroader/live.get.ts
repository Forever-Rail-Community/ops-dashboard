// What moves on the Railroader map: the latest trains and switch positions from each Railroader server.
export default defineEventHandler(async (event): Promise<LiveResponse> => {
  await requirePermission(event, 'map.view')
  const staleAfter = Number(useRuntimeConfig(event).staleAfterSec)
  const [trainReports, switchReports] = await Promise.all([
    latestReports<RailroaderTrains>('railroader', 'trains', staleAfter),
    latestReports<RailroaderSwitches>('railroader', 'switches', staleAfter)
  ])

  const ageOf = (reports: { ageSec: number; stale: boolean }[]): ReportAge => ({
    ageSec: reports.length ? Math.min(...reports.map((r) => r.ageSec)) : null,
    stale: reports.length > 0 && reports.every((r) => r.stale)
  })

  return {
    trains: trainReports.flatMap(({ stored }) => stored.data.trains.map((t) => ({ ...t, agentId: stored.agentId }))),
    trainsAge: ageOf(trainReports),
    switches: Object.assign({}, ...switchReports.map(({ stored }) => stored.data.thrown)),
    switchesAge: ageOf(switchReports)
  }
})
