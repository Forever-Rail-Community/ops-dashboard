// Edit desks: a line's desks, their names and where each starts.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.lines')
  const id = getRouterParam(event, 'id') ?? ''
  await saveDesks(id, await readBody(event), user)
  await logEvent(user, 'ctc.desks.save', { line: id })
  return listDesks()
})
