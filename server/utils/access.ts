import type { H3Event } from 'h3'

const splitIds = (value: unknown) =>
  String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)

// Discord user IDs that are always admins, so you can never lock yourself out from the Access page.
const bootstrapAdmins = () => splitIds(useRuntimeConfig().bootstrapAdminIds)

// Used at sign-in: which dashboard roles does this person get from their Discord roles?
export async function resolveAccess(userId: string, discordRoleIds: string[]) {
  const sql = await db()
  const ids = discordRoleIds.length ? discordRoleIds : ['-']
  const rows = await sql<{ key: string; label: string; permissions: string[] }[]>`
    SELECT key, label, permissions FROM roles
    WHERE key IN (
      SELECT role_key FROM role_mappings
      WHERE discord_role_id = '*' OR discord_role_id IN ${sql(ids)}
    )`

  const roles = rows.map((r) => r.key)
  const labels = rows.map((r) => r.label) // the roles' names, for the welcome
  const permissions = new Set(rows.flatMap((r) => r.permissions))

  if (bootstrapAdmins().includes(userId)) {
    ALL_PERMISSION_KEYS.forEach((p) => permissions.add(p))
    if (!roles.includes('admin')) { roles.push('admin'); labels.push('Admin') }
  }

  return roles.length ? { roles, labels, permissions: [...permissions] } : null
}

// Used on every protected request: permissions come from the roles as saved, not the sign-in cookie, so a role
// change takes effect without signing in again (within a minute; see remember.ts).
export async function livePermissions(user: { id: string; roles?: string[] }): Promise<string[]> {
  if (bootstrapAdmins().includes(user.id)) return ALL_PERMISSION_KEYS
  if (!user.roles?.length) return []
  const byRole = await remember('roles', async () => {
    const sql = await db()
    const rows = await sql<{ key: string; permissions: string[] }[]>`SELECT key, permissions FROM roles`
    return Object.fromEntries(rows.map((r) => [r.key, r.permissions])) as Record<string, string[]>
  })
  return [...new Set(user.roles.flatMap((role) => byRole[role] ?? []))]
}

// One permission, or a list of which any one will do.
export async function requirePermission(event: H3Event, permission: string | string[]) {
  const { user } = await requireUserSession(event)
  const permissions = await livePermissions(user)
  if (![permission].flat().some((p) => permissions.includes(p))) {
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
