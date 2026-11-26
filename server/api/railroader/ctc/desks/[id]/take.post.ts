// Takes an open desk. The turnover note is read on the page first.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const id = getRouterParam(event, 'id')
  await takeDesk(id, user)
  await logEvent(user, 'ctc.desk.take', { desk: id })
  return listDesks()
})
