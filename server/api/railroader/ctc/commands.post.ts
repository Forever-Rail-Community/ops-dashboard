// Clears a signal, stops a control point or throws its switch, from the CTC board.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const action = parseCtcAction(await readBody(event))
  if (!action) throw createError({ statusCode: 400, statusMessage: 'Not a CTC command.' })
  const server = await ctcServerFor(action)
  const text = ctcCommandText(action)
  const command = await queueCommand(server.id, text, user)
  await markWatching('railroader')
  await logEvent(user, 'ctc.command', { server: server.id, command: text })
  return command
})
