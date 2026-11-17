import postgres from 'postgres'

// The schema is a list of named steps. Each runs once per database and is recorded by name, so steps
// can be added (or removed) without shifting the others. Every step is written to be safe to run twice,
// in case two cold starts race. A step's name must never change once it has shipped.

// SQL that adds one permission to the named roles. Roles you made yourself are left alone.
const grantPermission = (permission: string, roleKeys: string[]) =>
  `UPDATE roles SET permissions = permissions || '["${permission}"]'::jsonb
   WHERE key IN (${roleKeys.map((k) => `'${k}'`).join(', ')}) AND NOT (permissions @> '["${permission}"]'::jsonb)`

const STEPS: { name: string; sql: string }[] = [
  {
    name: 'settings-table',
    sql: `CREATE TABLE IF NOT EXISTS settings (
      key text PRIMARY KEY,
      value jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text
    )`
  },
  {
    name: 'roles-table',
    sql: `CREATE TABLE IF NOT EXISTS roles (
      key text PRIMARY KEY,
      label text NOT NULL,
      permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
      sort_order int NOT NULL DEFAULT 0
    )`
  },
  {
    name: 'role-mappings-table',
    sql: `CREATE TABLE IF NOT EXISTS role_mappings (
      discord_role_id text NOT NULL,
      role_key text NOT NULL REFERENCES roles(key) ON DELETE CASCADE ON UPDATE CASCADE,
      PRIMARY KEY (discord_role_id, role_key)
    )`
  },
  {
    name: 'audit-log-table',
    sql: `CREATE TABLE IF NOT EXISTS audit_log (
      id bigserial PRIMARY KEY,
      at timestamptz NOT NULL DEFAULT now(),
      actor_id text,
      actor_name text,
      action text NOT NULL,
      detail jsonb
    )`
  },
  // The map page needs its own permission. Give it to the three starting roles.
  { name: 'grant-map-view', sql: grantPermission('map.view', ['member', 'dispatcher', 'admin']) },
  // One row per game server that runs the agent. Only a hash of its key is stored.
  {
    name: 'agents-table',
    sql: `CREATE TABLE IF NOT EXISTS agents (
      id text PRIMARY KEY,
      game text NOT NULL,
      key_hash text NOT NULL UNIQUE,
      created_by text NOT NULL,
      created_by_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`
  },
  { name: 'grant-admin-agents', sql: grantPermission('admin.agents', ['admin']) },
  // Help center. Categories group articles on the public help site.
  {
    name: 'help-categories-table',
    sql: `CREATE TABLE IF NOT EXISTS help_categories (
      id bigserial PRIMARY KEY,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      description text NOT NULL DEFAULT '',
      icon text NOT NULL DEFAULT 'book-open',
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`
  },
  // An article keeps two copies of its words: the draft staff are editing, and the published copy the
  // public site shows. Where it lives (category, URL, game, section, order) applies to both.
  {
    name: 'help-articles-table',
    sql: `CREATE TABLE IF NOT EXISTS help_articles (
      id bigserial PRIMARY KEY,
      category_id bigint NOT NULL REFERENCES help_categories(id) ON DELETE RESTRICT,
      slug text NOT NULL,
      game text NOT NULL DEFAULT 'all',
      section text NOT NULL DEFAULT '',
      sort_order int NOT NULL DEFAULT 0,
      draft jsonb NOT NULL,
      published jsonb,
      published_at timestamptz,
      published_by text,
      published_by_name text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by text NOT NULL,
      created_by_name text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by text NOT NULL,
      updated_by_name text NOT NULL,
      UNIQUE (category_id, slug)
    )`
  },
  // A copy of an article each time it is published, newest last.
  {
    name: 'help-revisions-table',
    sql: `CREATE TABLE IF NOT EXISTS help_revisions (
      id bigserial PRIMARY KEY,
      article_id bigint NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
      content jsonb NOT NULL,
      published_at timestamptz NOT NULL DEFAULT now(),
      published_by text NOT NULL,
      published_by_name text NOT NULL
    )`
  },
  {
    name: 'help-revisions-index',
    sql: `CREATE INDEX IF NOT EXISTS help_revisions_article ON help_revisions (article_id, published_at DESC)`
  },
  { name: 'grant-help-edit', sql: grantPermission('help.edit', ['admin']) },
  { name: 'grant-help-publish', sql: grantPermission('help.publish', ['admin']) }
]

// Steps used to be tracked by position in the list. The first five positions always meant these steps,
// so databases from then keep their history. Later positions were reused, so they are ignored.
const NUMBERED_STEPS = ['settings-table', 'roles-table', 'role-mappings-table', 'audit-log-table', 'grant-map-view']

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
  await sql`CREATE TABLE IF NOT EXISTS _schema_steps (name text PRIMARY KEY, done_at timestamptz NOT NULL DEFAULT now())`

  const [{ legacy }] = await sql<{ legacy: string | null }[]>`SELECT to_regclass('_migrations')::text AS legacy`
  if (legacy) {
    for (const { id } of await sql<{ id: number }[]>`SELECT id FROM _migrations`) {
      const name = NUMBERED_STEPS[id]
      if (name) await sql`INSERT INTO _schema_steps (name) VALUES (${name}) ON CONFLICT DO NOTHING`
    }
  }

  const done = new Set((await sql<{ name: string }[]>`SELECT name FROM _schema_steps`).map((r) => r.name))
  for (const step of STEPS) {
    if (done.has(step.name)) continue
    await sql.unsafe(step.sql)
    await sql`INSERT INTO _schema_steps (name) VALUES (${step.name}) ON CONFLICT DO NOTHING`
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
