// Changes some of the signed-in person's own choices. Fields left out keep their saved value.
export default defineEventHandler(async (event): Promise<Preferences> => {
  const { user } = await requireUserSession(event)
  const body = await readBody<Record<string, unknown>>(event)
  const changes: Partial<Preferences> = {}
  if (body?.units !== undefined) {
    if (!isUnitSystem(body.units)) throw createError({ statusCode: 400, statusMessage: 'units must be "imperial" or "metric"' })
    changes.units = body.units
  }
  return savePreferences(user.id, changes)
})
