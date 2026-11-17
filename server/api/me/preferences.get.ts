export default defineEventHandler(async (event): Promise<Preferences> => {
  const { user } = await requireUserSession(event)
  return readPreferences(user.id)
})
