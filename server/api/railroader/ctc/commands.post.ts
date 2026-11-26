// Clears a signal, stops a control point or throws its switch, from the CTC board: only on a desk the sender is on,
// where the line has desks.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const action = parseCtcAction(await readBody(event))
  if (!action) throw createError({ statusCode: 400, statusMessage: 'Not a CTC command.' })
  const { agent, cp } = await ctcServerFor(action)
  await requireDeskFor(cp, user)
  const text = ctcCommandText(action)
  const command = await queueCommand(agent.id, text, user)
  await markWatching('railroader')
  await logEvent(user, 'ctc.command', { server: agent.id, command: text })
  return command
})
