// Changes some of the signed-in person's own choices. Fields left out keep their saved value.
export default defineEventHandler(async (event): Promise<Preferences> => {
  const { user } = await requireUserSession(event)
  return savePreferences(user.id, parsePreferenceChanges(await readBody(event)))
})
