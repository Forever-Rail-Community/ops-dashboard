// Commands from the CTC board (shared/utils/ctcCommand.ts) go to the game server whose signal layout has that signal
// or control point, through the same queue as the Game status controls (server/utils/serverCommands.ts).

export const CTC_PREFIX = 'ctc '

export async function ctcServerFor(action: CtcAction): Promise<RegisteredAgent> {
  const reports = await latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  const found = reports.find(({ stored }) =>
    action.kind === 'clear'
      ? stored.data.controlPoints?.some((cp) => cp.signals.includes(action.signal))
      : stored.data.controlPoints?.some((cp) => cp.id === action.cp)
  )
  if (!found) throw createError({ statusCode: 404, statusMessage: 'No game server has that control point.' })
  return { id: found.stored.agentId, game: 'railroader' }
}

// The CTC board's latest commands across Railroader servers, newest first.
export async function listCtcCommands(): Promise<ServerCommand[]> {
  const lists = await Promise.all((await registeredAgents('railroader')).map((a) => listCommands(a.id, CTC_PREFIX)))
  return lists.flat().sort((a, b) => b.id - a.id).slice(0, COMMAND_HISTORY)
}
