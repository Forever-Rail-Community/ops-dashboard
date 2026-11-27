// Who staff can assign a ticket to.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'tickets.manage')
  return assignableStaff(user)
})
