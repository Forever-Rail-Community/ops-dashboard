import type { H3Event } from 'h3'

// One game's latest status reports, for its status endpoint. Only servers still registered
// in Admin > Servers are included, so a removed server disappears from the dashboard.
export async function readStatusReports<G extends GameKey>(event: H3Event, game: G) {
  const { permissions } = await requirePermission(event, 'status.view')
  const { staleAfterSec } = useRuntimeConfig(event)
  const detailed = permissions.includes('status.detail')

  const reports = (await latestReports<StatusByGame[G]>(game, 'status', Number(staleAfterSec))).map(({ stored, ageSec, stale }) => ({
    status: stored.data,
    base: { agentId: stored.agentId, ageSec, stale, system: detailed ? stored.data.system : null } as AgentBase
  }))
  return { detailed, permissions, reports }
}
