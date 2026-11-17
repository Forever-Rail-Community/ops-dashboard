// Each person's own choices, saved with their account (their Discord id). Missing rows mean the defaults.
export async function readPreferences(userId: string): Promise<Preferences> {
  const sql = await db()
  const [row] = await sql<{ units: string }[]>`SELECT units FROM user_preferences WHERE user_id = ${userId}`
  return { units: isUnitSystem(row?.units) ? row.units : DEFAULT_UNITS }
}

export async function savePreferences(userId: string, changes: Partial<Preferences>): Promise<Preferences> {
  const next = { ...(await readPreferences(userId)), ...changes }
  const sql = await db()
  await sql`
    INSERT INTO user_preferences (user_id, units) VALUES (${userId}, ${next.units})
    ON CONFLICT (user_id) DO UPDATE SET units = EXCLUDED.units, updated_at = now()`
  return next
}
