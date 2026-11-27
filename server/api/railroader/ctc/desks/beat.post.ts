// An open page of the site checking in for a dispatcher (every DESK_BEAT_SEC): still here, and how long since they
// last used the site. The answer says whether they're still on a desk, and why not if they were just taken off.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'ctc.control')
  return checkIn(user, ((await readBody(event)) as { idleSec?: unknown } | null)?.idleSec)
})
