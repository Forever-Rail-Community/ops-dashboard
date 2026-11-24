// The members' Overview of Railroader. See shared/types/overview.ts for what's included.
export default defineEventHandler(async (event): Promise<RailroaderOverview> => {
  const { permissions } = await requirePermission(event, 'overview.view')
  const staleAfter = Number(useRuntimeConfig(event).staleAfterSec)
  const [statusReports, trainReports, map] = await Promise.all([
    latestReports<RailroaderStatus>('railroader', 'status', staleAfter),
    latestReports<RailroaderTrains>('railroader', 'trains', staleAfter),
    useStorage('assets:server').getItem<MapData>('map.json')
  ])

  const fresh = statusReports.filter((r) => !r.stale).map((r) => r.stored.data.railroader)
  const isOnline = (rr: RailroaderReport) => rr.process.status === 'online' && rr.api?.sessionState === 'active'
  // One railroad: a server with a session running if there is one, otherwise any server that's reporting.
  const rr = fresh.find(isOnline) ?? fresh[0]
  const online = !!rr && isOnline(rr)
  const railroad: OverviewRailroad | null = rr
    ? {
        online,
        upSec: online ? (rr.process.uptimeSec ?? null) : null,
        name: rr.api?.railroadName ?? null,
        gameVersion: rr.api?.gameVersion ?? null,
        ...(online && rr.multiplayer && permissions.includes('multiplayer.joinCode') ? { joinCode: rr.multiplayer.joinCode } : {})
      }
    : null

  const trains = online && map
    ? trainReports.filter((r) => !r.stale).flatMap((r) => r.stored.data.trains).map((t): OverviewTrain => ({
        id: t.id, name: t.name, speedMph: Math.round(t.speedMph), near: nearestTown(map, t.x, t.z)
      }))
    : []

  return { railroad, trains }
})
