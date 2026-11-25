// Saves a line, new or changed.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.lines')
  const line = parseLineInput(getRouterParam(event, 'id'), await readBody(event))
  await saveLine(line.id, line.name, line.data, user)
  await logEvent(user, 'ctc.line.save', { id: line.id, name: line.name, towns: line.data.towns.length })
  return { ok: true }
})
