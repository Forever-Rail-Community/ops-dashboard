// Staff answering a report: status, reply to the reporter, linked roadmap item.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'bugs.manage')
  const id = parseBugId(getRouterParam(event, 'id'))
  const { before, report } = await triageBug(id, parseBugTriage(await readBody(event)), user)
  if (before.status !== report.status) await logEvent(user, 'bug.status', { id, title: report.title, status: report.status })
  return report
})
