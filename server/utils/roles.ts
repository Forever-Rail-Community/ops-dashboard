import type { H3Event } from 'h3'

const rank: Record<Role, number> = { member: 1, dispatcher: 2, admin: 3 }

export const hasRole = (role: Role, min: Role) => rank[role] >= rank[min]

export async function requireRole(event: H3Event, min: Role = 'member') {
  const { user } = await requireUserSession(event)
  if (!hasRole(user.role, min)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return user
}

const split = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean)

interface RoleConfig {
  adminRoleIds: string
  dispatcherRoleIds: string
  memberRoleIds: string
}

// Maps a person's Discord role IDs to a dashboard role. Returns null when they shouldn't get in.
// If no member role IDs are configured, any server member can view the dashboard.
export function roleFromDiscordRoles(discordRoleIds: string[], cfg: RoleConfig): Role | null {
  const has = (ids: string[]) => discordRoleIds.some((r) => ids.includes(r))
  if (has(split(cfg.adminRoleIds))) return 'admin'
  if (has(split(cfg.dispatcherRoleIds))) return 'dispatcher'
  const memberIds = split(cfg.memberRoleIds)
  if (memberIds.length === 0 || has(memberIds)) return 'member'
  return null
}
