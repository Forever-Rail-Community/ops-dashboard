// Starts a draft.
export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'updates.post')
  return createUpdate(parseUpdateInput(await readBody(event)), user)
})
