// The CTC board's latest commands and the game's answers. Having the board's controls open counts as watching, so the
// game server's agent reports (and picks up commands) at full pace.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'ctc.control')
  await markWatching('railroader')
  return listCtcCommands()
})
