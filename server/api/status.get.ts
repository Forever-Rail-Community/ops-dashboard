type Stored = Snapshot & { receivedAt: number }

export default defineEventHandler(async (event): Promise<StatusResponse> => {
  const { user, permissions } = await requirePermission(event, 'status.view')
  const { staleAfterSec } = useRuntimeConfig(event)
  const detailed = permissions.includes('status.detail')

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
      // Members see only whether the game is up and what session is loaded; process figures and error text are for staff.
      railroader: s.railroader
        ? {
            process: detailed
              ? s.railroader.process
              : { status: s.railroader.process.status, uptimeSec: s.railroader.process.uptimeSec },
            api: s.railroader.api
              ? { ...s.railroader.api, error: detailed ? s.railroader.api.error : null }
              : undefined
          }
        : null,
      routes: s.routes.map((r) =>
        detailed ? r : { name: r.name, port: r.port, status: r.status, uptimeSec: r.uptimeSec }
      )
    })
  }

  agents.sort((a, b) => a.agentId.localeCompare(b.agentId))
  return { detailed, staleAfterSec: Number(staleAfterSec), agents }
})
