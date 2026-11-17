// Your bug reports; with ?all=1, everyone's (staff only).
export default defineEventHandler(async (event): Promise<BugReport[]> => {
  const { user } = await requireUserSession(event)
  const all = getQuery(event).all === '1'
  if (all) await requirePermission(event, 'bugs.manage')
  return listBugs(user.id, all)
})
