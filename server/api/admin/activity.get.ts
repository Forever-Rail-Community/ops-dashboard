export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.activity')
  const sql = await db()
  return await sql`SELECT id, at, actor_name AS "actorName", action, detail
                   FROM audit_log ORDER BY id DESC LIMIT 100`
})
