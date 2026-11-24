// What the dashboard does with each kind of data a game server sends. A report looks like
//   { "game": "run8", "sentAt": "...", "reports": { "status": { ... } } }
// Each game lists the kinds it understands. To add one later (chat, a leaderboard), add a handler here.
// Kinds a game doesn't list are skipped rather than refused, so a newer agent can talk to an older dashboard.

type Handler = (agent: RegisteredAgent, data: unknown, sentAt: string) => Promise<void>

const HANDLERS: Record<GameKey, Record<string, Handler>> = {
  run8: {
    status: (agent, data, sentAt) => saveReport('status', agent, sentAt, parseRun8Status(data))
  },
  railroader: {
    status: (agent, data, sentAt) => saveReport('status', agent, sentAt, parseRailroaderStatus(data)),
    trains: (agent, data, sentAt) => saveReport('trains', agent, sentAt, parseTrains(data)),
    trainhistory: (agent, data, sentAt) => saveReport('trainhistory', agent, sentAt, parseTrainHistory(data)),
    switches: (agent, data, sentAt) => saveReport('switches', agent, sentAt, parseSwitches(data)),
    industries: (agent, data, sentAt) => saveReport('industries', agent, sentAt, parseIndustries(data)),
    signals: (agent, data, sentAt) => saveReport('signals', agent, sentAt, parseSignals(data)),
    signallayout: (agent, data, sentAt) => saveReport('signallayout', agent, sentAt, parseSignalLayout(data))
  }
}

const MAX_KINDS = 10

export async function acceptReport(agent: RegisteredAgent, body: unknown) {
  if (!body || typeof body !== 'object') throw createError({ statusCode: 400, statusMessage: 'Body must be a JSON object' })
  const b = body as Record<string, any>

  // The key decides the game. A mismatch almost always means the wrong key was pasted into a server's .env.
  if (b.game !== agent.game) {
    throw createError({
      statusCode: 409,
      statusMessage: `This key belongs to "${agent.id}", a ${agent.game} server, but the agent says its game is "${b.game}".`
    })
  }
  if (!b.reports || typeof b.reports !== 'object' || Array.isArray(b.reports)) {
    throw createError({ statusCode: 400, statusMessage: 'Missing reports' })
  }

  const sentAt = typeof b.sentAt === 'string' ? b.sentAt.slice(0, 40) : ''
  const accepted: string[] = []
  const skipped: string[] = []
  for (const [kind, data] of Object.entries(b.reports).slice(0, MAX_KINDS)) {
    const handle = HANDLERS[agent.game][kind]
    if (!handle) {
      skipped.push(kind.slice(0, 40))
      continue
    }
    await handle(agent, data, sentAt)
    accepted.push(kind)
  }
  // Tells the agent whether to send at full pace. Agents older than 0.11 ignore it and always do.
  return { server: agent.id, game: agent.game, accepted, skipped, watching: await isWatched(agent.game) }
}
