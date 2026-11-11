const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })

export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.roles')
  const body = await readBody(event)

  if (!Array.isArray(body?.roles) || !Array.isArray(body?.mappings)) throw bad('Invalid request')
  if (body.roles.length > 30 || body.mappings.length > 200) throw bad('Too many roles or mappings')

  const roles: RoleDef[] = body.roles.map((r: any) => {
    const key = String(r?.key ?? '')
    const label = String(r?.label ?? '').trim()
    if (!/^[a-z][a-z0-9-]{1,40}$/.test(key)) throw bad('Invalid role key')
    if (!label || label.length > 40) throw bad('Role names must be 1 to 40 characters')
    const permissions = Array.isArray(r.permissions) ? r.permissions.map(String) : []
    if (permissions.some((p: string) => !ALL_PERMISSION_KEYS.includes(p))) throw bad('Unknown permission')
    return { key, label, permissions: [...new Set(permissions)] as string[] }
  })

  if (new Set(roles.map((r) => r.key)).size !== roles.length) throw bad('Duplicate role')

  // Someone must always be able to manage access and settings.
  if (!roles.some((r) => r.permissions.includes('admin.roles') && r.permissions.includes('admin.settings'))) {
    throw bad('At least one role must keep both "Manage roles" and "Change appearance" permissions')
  }

  const keys = new Set(roles.map((r) => r.key))
  const mappings: RoleMapping[] = body.mappings.map((m: any) => {
    const discordRoleId = String(m?.discordRoleId ?? '').trim()
    const roleKey = String(m?.roleKey ?? '')
    if (!/^(\*|\d{5,25})$/.test(discordRoleId)) throw bad('Discord role IDs are numbers (or use "any server member")')
    if (!keys.has(roleKey)) throw bad('A mapping points to a role that does not exist')
    return { discordRoleId, roleKey }
  })

  // "Any server member" must never grant admin powers.
  const open = new Set(mappings.filter((m) => m.discordRoleId === '*').map((m) => m.roleKey))
  for (const r of roles) {
    if (open.has(r.key) && r.permissions.some((p) => p.startsWith('admin.'))) {
      throw bad('"Any server member" cannot be linked to a role with admin permissions')
    }
  }

  const sql = await db()
  await sql.begin(async (tx) => {
    await tx`DELETE FROM role_mappings`
    for (const [i, r] of roles.entries()) {
      await tx`INSERT INTO roles (key, label, permissions, sort_order)
               VALUES (${r.key}, ${r.label}, ${tx.json(r.permissions)}, ${i})
               ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, permissions = EXCLUDED.permissions, sort_order = EXCLUDED.sort_order`
    }
    await tx`DELETE FROM roles WHERE key NOT IN ${tx([...keys])}`
    for (const m of mappings) {
      await tx`INSERT INTO role_mappings (discord_role_id, role_key) VALUES (${m.discordRoleId}, ${m.roleKey}) ON CONFLICT DO NOTHING`
    }
  })

  await logEvent(user, 'access.update', { roles: roles.map((r) => r.key), mappings: mappings.length })
  return { roles, mappings }
})
