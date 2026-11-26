// Leaves your desk with a turnover note for whoever takes it next.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const id = getRouterParam(event, 'id')
  await leaveDesk(id, user, parseTurnoverNote(await readBody(event)))
  await logEvent(user, 'ctc.desk.leave', { desk: id })
  return listDesks()
})
