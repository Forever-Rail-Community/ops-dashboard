// Live trains for the Railroader map: the latest "trains" report from each Railroader server.
export default defineEventHandler(async (event): Promise<TrainsResponse> => {
  await requirePermission(event, 'map.view')
  const { staleAfterSec } = useRuntimeConfig(event)
  const reports = await latestReports<RailroaderTrains>('railroader', 'trains', Number(staleAfterSec))

  return {
    trains: reports.flatMap(({ stored }) => stored.data.trains.map((t) => ({ ...t, agentId: stored.agentId }))),
    ageSec: reports.length ? Math.min(...reports.map((r) => r.ageSec)) : null,
    stale: reports.length > 0 && reports.every((r) => r.stale)
  }
})
