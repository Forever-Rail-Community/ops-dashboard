export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.settings')
  const next = validateSite(await readBody(event))
  const before = await loadSite()

  const sql = await db()
  await sql`INSERT INTO settings (key, value, updated_by)
            VALUES ('site', ${sql.json(next as never)}, ${user.id})
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`

  const changed = (Object.keys(next) as (keyof SiteSettings)[]).filter(
    (k) => JSON.stringify(next[k]) !== JSON.stringify(before[k])
  )
  await logEvent(user, 'settings.update', { changed })
  return next
})
