// Every action the dashboard can check. Roles are made of these; admins pick them on the Access page.
export const PERMISSIONS = [
  { key: 'overview.view', label: 'View the game overview (join code, trains running, news)', group: 'Status' },
  { key: 'status.view', label: 'View route and game status (for staff)', group: 'Status' },
  { key: 'status.detail', label: 'See CPU, memory, process IDs, and server stats', group: 'Status' },
  { key: 'map.view', label: 'View the Railroader map', group: 'Map' },
  { key: 'ctc.view', label: 'View the Railroader CTC board', group: 'CTC' },
  { key: 'multiplayer.joinCode', label: 'See the Railroader multiplayer join code', group: 'Status' },
  { key: 'server.control', label: 'Start, save and shut down the game server, and send it commands', group: 'Status' },
  { key: 'help.edit', label: 'Write and edit help center drafts', group: 'Help center' },
  { key: 'help.publish', label: 'Publish, unpublish, and delete articles; manage categories', group: 'Help center' },
  { key: 'bugs.manage', label: 'See and answer all bug reports', group: 'Bug reports' },
  { key: 'roadmap.manage', label: 'Manage the roadmap and answer feature requests', group: 'Roadmap' },
  { key: 'updates.post', label: "Write, publish, and delete What's new updates", group: "What's new" },
  { key: 'admin.settings', label: 'Change appearance and wording', group: 'Admin' },
  { key: 'admin.roles', label: 'Manage roles and Discord access', group: 'Admin' },
  { key: 'admin.activity', label: 'View the activity log', group: 'Admin' },
  { key: 'admin.agents', label: 'Manage game servers and their agent keys', group: 'Admin' },
  { key: 'admin.lines', label: 'Set up the CTC board\'s lines', group: 'Admin' }
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
  { key: 'member', label: 'Member', permissions: ['overview.view', 'map.view', 'multiplayer.joinCode'] },
  { key: 'dispatcher', label: 'Dispatcher', permissions: ['overview.view', 'map.view', 'ctc.view', 'multiplayer.joinCode'] },
  { key: 'admin', label: 'Admin', permissions: [...ALL_PERMISSION_KEYS] }
]
