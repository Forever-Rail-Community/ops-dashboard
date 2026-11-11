export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.roles')
  const sql = await db()
  const roles = await sql<RoleDef[]>`SELECT key, label, permissions FROM roles ORDER BY sort_order, label`
  const mappings = await sql<RoleMapping[]>`
    SELECT discord_role_id AS "discordRoleId", role_key AS "roleKey"
    FROM role_mappings ORDER BY discord_role_id, role_key`
  return { roles, mappings }
})
