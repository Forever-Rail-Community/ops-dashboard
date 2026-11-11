import postgres from 'postgres'

// The schema lives here as an ordered list. Each entry runs once, so later phases just add entries.
// Everything is written to be safe to run twice, in case two cold starts race.
const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS settings (
     key text PRIMARY KEY,
     value jsonb NOT NULL,
     updated_at timestamptz NOT NULL DEFAULT now(),
     updated_by text
   )`,
  `CREATE TABLE IF NOT EXISTS roles (
     key text PRIMARY KEY,
     label text NOT NULL,
     permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
     sort_order int NOT NULL DEFAULT 0
   )`,
  `CREATE TABLE IF NOT EXISTS role_mappings (
     discord_role_id text NOT NULL,
     role_key text NOT NULL REFERENCES roles(key) ON DELETE CASCADE ON UPDATE CASCADE,
     PRIMARY KEY (discord_role_id, role_key)
   )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
     id bigserial PRIMARY KEY,
     at timestamptz NOT NULL DEFAULT now(),
     actor_id text,
     actor_name text,
     action text NOT NULL,
     detail jsonb
   )`,
  // The map page needs its own permission. Give it to the three starting roles; roles you made yourself are left alone.
  `UPDATE roles SET permissions = permissions || '["map.view"]'::jsonb
   WHERE key IN ('member', 'dispatcher', 'admin') AND NOT (permissions @> '["map.view"]'::jsonb)`
]

type Sql = ReturnType<typeof postgres>

let client: Sql | undefined
let ready: Promise<Sql> | undefined

function connect(): Sql {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) {
    throw createError({ statusCode: 500, statusMessage: 'The database is not configured (DATABASE_URL is missing)' })
  }
  const local = /@(localhost|127\.0\.0\.1)/.test(url)
  // prepare: false keeps this compatible with Neon's pooled connection string.
  client ??= postgres(url, { ssl: local ? false : 'require', max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 })
  return client
}

async function migrate(sql: Sql) {
  await sql`CREATE TABLE IF NOT EXISTS _migrations (id int PRIMARY KEY)`
  const done = new Set((await sql<{ id: number }[]>`SELECT id FROM _migrations`).map((r) => r.id))
  for (const [i, statement] of MIGRATIONS.entries()) {
    if (done.has(i)) continue
    await sql.unsafe(statement)
    await sql`INSERT INTO _migrations (id) VALUES (${i}) ON CONFLICT DO NOTHING`
  }
  await seedDefaults(sql)
}

const splitIds = (value: unknown) =>
  String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean)

// First run only: create the default roles. If the older role-ID environment variables are set,
// they become the starting Discord mappings so nothing changes for existing users.
async function seedDefaults(sql: Sql) {
  const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM roles`
  if (count > 0) return

  for (const [i, r] of DEFAULT_ROLES.entries()) {
    await sql`INSERT INTO roles (key, label, permissions, sort_order)
              VALUES (${r.key}, ${r.label}, ${sql.json(r.permissions)}, ${i}) ON CONFLICT (key) DO NOTHING`
  }

  const cfg = useRuntimeConfig().discord
  const member = splitIds(cfg.memberRoleIds)
  const mappings: [string, string][] = [
    ...splitIds(cfg.adminRoleIds).map((id): [string, string] => [id, 'admin']),
    ...splitIds(cfg.dispatcherRoleIds).map((id): [string, string] => [id, 'dispatcher']),
    ...(member.length ? member.map((id): [string, string] => [id, 'member']) : [['*', 'member'] as [string, string]])
  ]
  for (const [discordRoleId, roleKey] of mappings) {
    await sql`INSERT INTO role_mappings (discord_role_id, role_key) VALUES (${discordRoleId}, ${roleKey}) ON CONFLICT DO NOTHING`
  }
}

// Use this everywhere: it connects, makes sure the tables exist, and hands back the query function.
export async function db(): Promise<Sql> {
  const sql = connect()
  ready ??= migrate(sql).then(() => sql).catch((err) => {
    ready = undefined
    throw err
  })
  return ready
}
