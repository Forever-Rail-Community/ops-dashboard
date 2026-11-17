// Each person's own choices, saved with their account (their Discord id). Missing rows mean the defaults.

const DEFAULTS: Preferences = { units: DEFAULT_UNITS, whatsNewAuto: true, whatsNewSeen: 0 }

export async function readPreferences(userId: string): Promise<Preferences> {
  const sql = await db()
  const [row] = await sql<{ units: string; whats_new_auto: boolean; whats_new_seen: number }[]>`
    SELECT units, whats_new_auto, whats_new_seen FROM user_preferences WHERE user_id = ${userId}`
  if (!row) return DEFAULTS
  return { units: isUnitSystem(row.units) ? row.units : DEFAULT_UNITS, whatsNewAuto: row.whats_new_auto, whatsNewSeen: row.whats_new_seen }
}

export async function savePreferences(userId: string, changes: Partial<Preferences>): Promise<Preferences> {
  const next = { ...(await readPreferences(userId)), ...changes }
  const sql = await db()
  await sql`
    INSERT INTO user_preferences (user_id, units, whats_new_auto, whats_new_seen)
    VALUES (${userId}, ${next.units}, ${next.whatsNewAuto}, ${next.whatsNewSeen})
    ON CONFLICT (user_id) DO UPDATE SET
      units = EXCLUDED.units, whats_new_auto = EXCLUDED.whats_new_auto, whats_new_seen = EXCLUDED.whats_new_seen, updated_at = now()`
  return next
}

// Checks a PUT body: only the fields given, each of the right kind.
export function parsePreferenceChanges(body: Record<string, unknown> | undefined): Partial<Preferences> {
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
  const changes: Partial<Preferences> = {}
  if (body?.units !== undefined) {
    if (!isUnitSystem(body.units)) throw bad('units must be "imperial" or "metric"')
    changes.units = body.units
  }
  if (body?.whatsNewAuto !== undefined) {
    if (typeof body.whatsNewAuto !== 'boolean') throw bad('whatsNewAuto must be true or false')
    changes.whatsNewAuto = body.whatsNewAuto
  }
  if (body?.whatsNewSeen !== undefined) {
    if (!Number.isSafeInteger(body.whatsNewSeen) || (body.whatsNewSeen as number) < 0) throw bad('whatsNewSeen must be an update id')
    changes.whatsNewSeen = body.whatsNewSeen as number
  }
  return changes
}
