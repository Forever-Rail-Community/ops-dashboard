// Sends a command to a game server: held until its agent picks it up (server/utils/serverCommands.ts).
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'server.control')
  const agent = await requireCommandServer(getRouterParam(event, 'id'))
  const text = parseCommandText(await readBody(event))
  const command = await queueCommand(agent.id, text, user)
  await markWatching(agent.game)
  await logEvent(user, 'server.command', { server: agent.id, command: text })
  return command
})
