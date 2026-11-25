export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.lines')
  const id = getRouterParam(event, 'id')!
  await deleteLine(id)
  await logEvent(user, 'ctc.line.delete', { id })
  return { ok: true }
})
