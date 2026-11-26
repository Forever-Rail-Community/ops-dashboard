// An open Operations Center page saying its dispatcher is still here (every DESK_BEAT_SEC, from the layout). Only
// someone on a desk is written down: one Redis command. The answer says whether to keep going.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  const onDesk = (await listDesks()).desks.some((d) => d.holder?.userId === user.id)
  if (onDesk) await beat(user.id)
  return { onDesk }
})
