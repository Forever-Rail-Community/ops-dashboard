type Stored = Snapshot & { receivedAt: number }

export default defineEventHandler(async (event): Promise<StatusResponse> => {
  const user = await requireRole(event, 'member')
  const { staleAfterSec } = useRuntimeConfig(event)
  const detailed = hasRole(user.role, 'dispatcher')

  const storage = useStorage('data')
  const keys = await storage.getKeys('agent')
  const now = Date.now()
  const agents: AgentStatus[] = []

  for (const key of keys) {
    const s = await storage.getItem<Stored>(key)
    if (!s) continue
    const ageSec = Math.max(0, Math.round((now - s.receivedAt) / 1000))

    agents.push({
      agentId: s.agentId,
      sentAt: s.sentAt,
      receivedAt: s.receivedAt,
      ageSec,
      stale: ageSec > Number(staleAfterSec),
      system: detailed ? s.system : null,
      unmapped: detailed ? s.unmapped : [],
      routes: s.routes.map((r) =>
        detailed ? r : { name: r.name, port: r.port, status: r.status, uptimeSec: r.uptimeSec }
      )
    })
  }

  agents.sort((a, b) => a.agentId.localeCompare(b.agentId))
  return { role: user.role, staleAfterSec: Number(staleAfterSec), agents }
})
