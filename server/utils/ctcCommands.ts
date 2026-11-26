// Commands from the CTC board (shared/utils/ctcCommand.ts) go to the game server whose signal layout has that signal
// or control point, through the same queue as the Game status controls (server/utils/serverCommands.ts).

export const CTC_PREFIX = 'ctc '

// The game server whose layout has the action's control point, and that control point.
export async function ctcServerFor(action: CtcAction): Promise<{ agent: RegisteredAgent; cp: string }> {
  const reports = await latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  for (const { stored } of reports) {
    const cp = stored.data.controlPoints?.find((c) => (action.kind === 'clear' ? c.signals.includes(action.signal) : c.id === action.cp))
    if (cp) return { agent: { id: stored.agentId, game: 'railroader' }, cp: cp.id }
  }
  throw createError({ statusCode: 404, statusMessage: 'No game server has that control point.' })
}

// The CTC board's latest commands across Railroader servers, newest first.
export async function listCtcCommands(): Promise<ServerCommand[]> {
  const lists = await Promise.all((await registeredAgents('railroader')).map((a) => listCommands(a.id, CTC_PREFIX)))
  return lists.flat().sort((a, b) => b.id - a.id).slice(0, COMMAND_HISTORY)
}
