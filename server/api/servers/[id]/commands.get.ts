// A server's latest commands and their answers, for the Game status page's Controls. Having it open counts as
// watching, so the server's agent reports (and picks up commands) at full pace.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'server.control')
  const agent = await requireCommandServer(getRouterParam(event, 'id'))
  await markWatching(agent.game)
  return listCommands(agent.id)
})
