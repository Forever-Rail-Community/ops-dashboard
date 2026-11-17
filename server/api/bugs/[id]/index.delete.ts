// Deletes a report and its screenshots (staff).
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'bugs.manage')
  const report = await deleteBug(parseBugId(getRouterParam(event, 'id')), user)
  await logEvent(user, 'bug.delete', { id: report.id, title: report.title })
  return report
})
