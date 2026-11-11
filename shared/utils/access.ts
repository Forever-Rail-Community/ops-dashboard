// Every action the dashboard can check. Roles are made of these; admins pick them on the Access page.
export const PERMISSIONS = [
  { key: 'status.view', label: 'View route status', group: 'Status' },
  { key: 'status.detail', label: 'See CPU, memory, process IDs, and server stats', group: 'Status' },
  { key: 'admin.settings', label: 'Change appearance and wording', group: 'Admin' },
  { key: 'admin.roles', label: 'Manage roles and Discord access', group: 'Admin' },
  { key: 'admin.activity', label: 'View the activity log', group: 'Admin' }
] as const

export const ALL_PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key)

export interface RoleDef {
  key: string
  label: string
  permissions: string[]
}

export interface RoleMapping {
  discordRoleId: string // a Discord role ID, or '*' for any server member
  roleKey: string
}

export const DEFAULT_ROLES: RoleDef[] = [
  { key: 'member', label: 'Member', permissions: ['status.view'] },
  { key: 'dispatcher', label: 'Dispatcher', permissions: ['status.view', 'status.detail'] },
  { key: 'admin', label: 'Admin', permissions: [...ALL_PERMISSION_KEYS] }
]
