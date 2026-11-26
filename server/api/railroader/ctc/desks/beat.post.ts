// An open CTC board or Desks page saying its dispatcher is still there (every DESK_BEAT_SEC). One Redis command.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  await beat(user.id)
  return { ok: true }
})
