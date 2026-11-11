import type { H3Event } from 'h3'

const splitIds = (value: unknown) =>
  String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)

// Discord user IDs that are always admins, so you can never lock yourself out from the Access page.
const bootstrapAdmins = () => splitIds(useRuntimeConfig().bootstrapAdminIds)

// Used at sign-in: which dashboard roles does this person get from their Discord roles?
export async function resolveAccess(userId: string, discordRoleIds: string[]) {
  const sql = await db()
  const ids = discordRoleIds.length ? discordRoleIds : ['-']
  const rows = await sql<{ key: string; permissions: string[] }[]>`
    SELECT key, permissions FROM roles
    WHERE key IN (
      SELECT role_key FROM role_mappings
      WHERE discord_role_id = '*' OR discord_role_id IN ${sql(ids)}
    )`

  const roles = rows.map((r) => r.key)
  const permissions = new Set(rows.flatMap((r) => r.permissions))

  if (bootstrapAdmins().includes(userId)) {
    ALL_PERMISSION_KEYS.forEach((p) => permissions.add(p))
    if (!roles.includes('admin')) roles.push('admin')
  }

  return roles.length ? { roles, permissions: [...permissions] } : null
}

// Used on every protected request: read permissions from the database, not the sign-in cookie,
// so a role change takes effect right away.
export async function livePermissions(user: { id: string; roles?: string[] }): Promise<string[]> {
  if (bootstrapAdmins().includes(user.id)) return ALL_PERMISSION_KEYS
  if (!user.roles?.length) return []
  const sql = await db()
  const rows = await sql<{ permissions: string[] }[]>`SELECT permissions FROM roles WHERE key IN ${sql(user.roles)}`
  return [...new Set(rows.flatMap((r) => r.permissions))]
}

export async function requirePermission(event: H3Event, permission: string) {
  const { user } = await requireUserSession(event)
  const permissions = await livePermissions(user)
  if (!permissions.includes(permission)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return { user, permissions }
}

// Records who did what. A logging failure never blocks the action itself.
export async function logEvent(
  user: { id: string; name: string },
  action: string,
  detail: Record<string, unknown> = {}
) {
  try {
    const sql = await db()
    await sql`INSERT INTO audit_log (actor_id, actor_name, action, detail)
              VALUES (${user.id}, ${user.name}, ${action}, ${sql.json(detail as never)})`
  } catch (err) {
    console.error('audit log write failed', err)
  }
}
