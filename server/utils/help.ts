// Help center categories and articles. Editing an article changes only its draft; the public site shows
// the published copy, which changes only when someone publishes.

type Actor = { id: string; name: string }

const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
const notFound = (what: string) => createError({ statusCode: 404, statusMessage: `${what} not found` })
const conflict = (message: string) => createError({ statusCode: 409, statusMessage: message })

// Postgres error codes this file turns into friendly messages.
const UNIQUE_VIOLATION = '23505'
const isUnique = (err: unknown) => (err as { code?: string })?.code === UNIQUE_VIOLATION

// ---------------------------------------------------------------------------------------------------
// Checking what the editor sends

function text(value: unknown, field: string, max: number, required = true): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if ((required && !s) || s.length > max) {
    throw bad(`${field} must be ${required ? '1' : '0'} to ${max} characters`)
  }
  return s
}

function slug(value: unknown, field = 'URL'): string {
  const s = typeof value === 'string' ? value.trim() : ''
  if (!HELP_SLUG.test(s) || s.length > HELP_LIMITS.slug) {
    throw bad(`${field} must be lowercase letters, numbers, and single dashes (up to ${HELP_LIMITS.slug} characters)`)
  }
  return s
}

function order(value: unknown): number {
  const n = Number(value ?? 0)
  if (!Number.isInteger(n) || n < 0 || n > 10_000) throw bad('Order must be a whole number from 0 to 10000')
  return n
}

function id(value: unknown, what: string): number {
  const n = Number(value)
  if (!Number.isSafeInteger(n) || n < 1) throw notFound(what)
  return n
}

function doc(value: unknown): HelpDoc {
  const d = value as HelpDoc | null
  if (!d || typeof d !== 'object' || d.type !== 'doc' || (d.content !== undefined && !Array.isArray(d.content))) {
    throw bad('The article body is not in the editor format')
  }
  if (new TextEncoder().encode(JSON.stringify(d)).length > HELP_LIMITS.bodyBytes) {
    throw bad('The article is too long. Split it into two articles, or use smaller images.')
  }
  return d
}

export const parseHelpCategoryId = (value: unknown) => id(value, 'Category')
export const parseHelpArticleId = (value: unknown) => id(value, 'Article')

export function parseHelpCategoryInput(body: any): HelpCategoryInput {
  if (!body || typeof body !== 'object') throw bad('Invalid category')
  const icon = typeof body.icon === 'string' && body.icon ? body.icon : 'book-open'
  if (!HELP_ICON.test(icon) || icon.length > 40) throw bad('Icon must be a Lucide icon name, like book-open')
  return {
    slug: slug(body.slug),
    name: text(body.name, 'Name', HELP_LIMITS.categoryName),
    description: text(body.description, 'Description', HELP_LIMITS.categoryDescription, false),
    icon,
    sortOrder: body.sortOrder === undefined ? undefined : order(body.sortOrder)
  }
}

export function parseHelpArticleInput(body: any): HelpArticleInput {
  if (!body || typeof body !== 'object') throw bad('Invalid article')
  if (!isHelpGame(body.game)) throw bad('Pick a game, or "all games"')
  const d = body.draft ?? {}
  return {
    categoryId: parseHelpCategoryId(body.categoryId),
    slug: slug(body.slug),
    game: body.game,
    section: text(body.section, 'Section', HELP_LIMITS.section, false),
    sortOrder: order(body.sortOrder),
    draft: {
      title: text(d.title, 'Title', HELP_LIMITS.title),
      summary: text(d.summary, 'Summary', HELP_LIMITS.summary, false),
      body: doc(d.body)
    },
    baseUpdatedAt: typeof body.baseUpdatedAt === 'string' ? body.baseUpdatedAt : undefined
  }
}

// ---------------------------------------------------------------------------------------------------
// Categories

interface CategoryRow {
  id: string // bigint comes back as a string
  slug: string
  name: string
  description: string
  icon: string
  sort_order: number
  article_count: number
}

const toCategory = (r: CategoryRow): HelpCategory => ({
  id: Number(r.id),
  slug: r.slug,
  name: r.name,
  description: r.description,
  icon: r.icon,
  sortOrder: r.sort_order,
  articleCount: r.article_count
})

export async function listHelpCategories(): Promise<HelpCategory[]> {
  const sql = await db()
  const rows = await sql<CategoryRow[]>`
    SELECT c.*, (SELECT count(*)::int FROM help_articles a WHERE a.category_id = c.id) AS article_count
    FROM help_categories c ORDER BY c.sort_order, c.name`
  return rows.map(toCategory)
}

export async function createHelpCategory(input: HelpCategoryInput): Promise<HelpCategory> {
  const sql = await db()
  try {
    const [row] = await sql<CategoryRow[]>`
      INSERT INTO help_categories (slug, name, description, icon, sort_order)
      VALUES (${input.slug}, ${input.name}, ${input.description}, ${input.icon},
              ${input.sortOrder ?? sql`(SELECT coalesce(max(sort_order), -1) + 1 FROM help_categories)`})
      RETURNING *, 0 AS article_count`
    return toCategory(row!)
  } catch (err) {
    if (isUnique(err)) throw conflict('Another category already uses that URL')
    throw err
  }
}

export async function updateHelpCategory(categoryId: number, input: HelpCategoryInput): Promise<HelpCategory> {
  const sql = await db()
  try {
    const [row] = await sql<CategoryRow[]>`
      UPDATE help_categories SET
        slug = ${input.slug}, name = ${input.name}, description = ${input.description}, icon = ${input.icon},
        sort_order = coalesce(${input.sortOrder ?? null}::int, sort_order), updated_at = now()
      WHERE id = ${categoryId}
      RETURNING *, (SELECT count(*)::int FROM help_articles a WHERE a.category_id = ${categoryId}) AS article_count`
    if (!row) throw notFound('Category')
    return toCategory(row)
  } catch (err) {
    if (isUnique(err)) throw conflict('Another category already uses that URL')
    throw err
  }
}

// Only empty categories can be deleted, so no article is ever lost by accident.
export async function deleteHelpCategory(categoryId: number): Promise<HelpCategory> {
  const sql = await db()
  return sql.begin(async (tx) => {
    const [row] = await tx<CategoryRow[]>`
      SELECT c.*, (SELECT count(*)::int FROM help_articles a WHERE a.category_id = c.id) AS article_count
      FROM help_categories c WHERE c.id = ${categoryId} FOR UPDATE`
    if (!row) throw notFound('Category')
    if (row.article_count > 0) throw conflict('Move or delete the articles in this category first')
    await tx`DELETE FROM help_categories WHERE id = ${categoryId}`
    return toCategory(row)
  })
}

// ---------------------------------------------------------------------------------------------------
// Articles

interface ArticleRow {
  id: string
  category_id: string
  slug: string
  game: HelpGame
  section: string
  sort_order: number
  draft: HelpContent
  published: HelpContent | null
  published_at: Date | null
  created_by_name: string
  updated_at: Date
  updated_by_name: string
  status: HelpStatus
}

// jsonb equality compares content, not formatting, so an unchanged draft reads as "published".
const STATUS = `CASE WHEN published IS NULL THEN 'draft' WHEN draft = published THEN 'published' ELSE 'changed' END`

const toSummary = (r: ArticleRow): HelpArticleSummary => ({
  id: Number(r.id),
  categoryId: Number(r.category_id),
  slug: r.slug,
  game: r.game,
  section: r.section,
  sortOrder: r.sort_order,
  title: r.draft.title,
  status: r.status,
  updatedAt: r.updated_at.toISOString(),
  updatedByName: r.updated_by_name,
  publishedAt: r.published_at?.toISOString() ?? null
})

const toArticle = (r: ArticleRow): HelpArticle => ({
  ...toSummary(r),
  draft: r.draft,
  published: r.published,
  createdByName: r.created_by_name
})

export async function listHelpArticles(): Promise<HelpArticleSummary[]> {
  const sql = await db()
  const rows = await sql<ArticleRow[]>`
    SELECT *, ${sql.unsafe(STATUS)} AS status FROM help_articles
    ORDER BY category_id, section, sort_order, draft->>'title'`
  return rows.map(toSummary)
}

export async function getHelpArticle(articleId: number): Promise<HelpArticle> {
  const sql = await db()
  const [row] = await sql<ArticleRow[]>`SELECT *, ${sql.unsafe(STATUS)} AS status FROM help_articles WHERE id = ${articleId}`
  if (!row) throw notFound('Article')
  return toArticle(row)
}

// Turns database errors from a save into messages the editor can show.
function explainSaveError(err: unknown): never {
  const code = (err as { code?: string })?.code
  if (code === UNIQUE_VIOLATION) throw conflict('Another article in this category already uses that URL')
  if (code === '23503') throw bad('That category no longer exists')
  throw err
}

export async function createHelpArticle(input: HelpArticleInput, actor: Actor): Promise<HelpArticle> {
  const sql = await db()
  try {
    const [row] = await sql<ArticleRow[]>`
      INSERT INTO help_articles
        (category_id, slug, game, section, sort_order, draft, created_by, created_by_name, updated_by, updated_by_name)
      VALUES (${input.categoryId}, ${input.slug}, ${input.game}, ${input.section}, ${input.sortOrder},
              ${sql.json(input.draft as never)}, ${actor.id}, ${actor.name}, ${actor.id}, ${actor.name})
      RETURNING *, 'draft' AS status`
    return toArticle(row!)
  } catch (err) {
    explainSaveError(err)
  }
}

// Saves the draft and placement. Refuses if someone else saved after the editor loaded the article.
export async function saveHelpArticle(articleId: number, input: HelpArticleInput, actor: Actor): Promise<HelpArticle> {
  const sql = await db()
  try {
    const [row] = await sql<ArticleRow[]>`
      UPDATE help_articles SET
        category_id = ${input.categoryId}, slug = ${input.slug}, game = ${input.game}, section = ${input.section},
        sort_order = ${input.sortOrder}, draft = ${sql.json(input.draft as never)},
        updated_at = now(), updated_by = ${actor.id}, updated_by_name = ${actor.name}
      WHERE id = ${articleId}
        AND (${input.baseUpdatedAt ?? null}::timestamptz IS NULL
             -- The editor's copy of updated_at is in milliseconds; Postgres keeps microseconds.
             OR date_trunc('milliseconds', updated_at) = ${input.baseUpdatedAt ?? null}::timestamptz)
      RETURNING *, ${sql.unsafe(STATUS)} AS status`
    if (row) return toArticle(row)
  } catch (err) {
    explainSaveError(err)
  }
  // Nothing was updated: either the article is gone, or someone saved it first.
  const current = await getHelpArticle(articleId)
  throw conflict(`${current.updatedByName} saved this article while you were editing. Reload to see their changes.`)
}

// Makes the draft public and keeps a copy of it in the article's history.
export async function publishHelpArticle(articleId: number, actor: Actor): Promise<HelpArticle> {
  const sql = await db()
  return sql.begin(async (tx) => {
    const [row] = await tx<ArticleRow[]>`
      UPDATE help_articles SET
        published = draft, published_at = now(), published_by = ${actor.id}, published_by_name = ${actor.name}
      WHERE id = ${articleId} AND published IS DISTINCT FROM draft
      RETURNING *, 'published' AS status`
    if (!row) {
      // Ask through tx: the pool has one connection, and this transaction is holding it.
      const [exists] = await tx`SELECT 1 FROM help_articles WHERE id = ${articleId}`
      throw exists ? conflict('There are no changes to publish') : notFound('Article')
    }
    await tx`INSERT INTO help_revisions (article_id, content, published_by, published_by_name)
             VALUES (${articleId}, ${tx.json(row.draft as never)}, ${actor.id}, ${actor.name})`
    return toArticle(row)
  })
}

// Throws away unpublished edits: the draft becomes the published copy again. The public site doesn't change.
export async function discardHelpDraft(articleId: number, actor: Actor): Promise<HelpArticle> {
  const sql = await db()
  const [row] = await sql<ArticleRow[]>`
    UPDATE help_articles SET draft = published, updated_at = now(), updated_by = ${actor.id}, updated_by_name = ${actor.name}
    WHERE id = ${articleId} AND published IS NOT NULL AND draft IS DISTINCT FROM published
    RETURNING *, 'published' AS status`
  if (!row) {
    const current = await getHelpArticle(articleId)
    throw conflict(current.published ? 'There are no unpublished changes to discard' : 'This article has never been published')
  }
  return toArticle(row)
}

// Takes the article off the public site. The draft and the history are kept.
export async function unpublishHelpArticle(articleId: number): Promise<HelpArticle> {
  const sql = await db()
  const [row] = await sql<ArticleRow[]>`
    UPDATE help_articles SET published = NULL, published_at = NULL, published_by = NULL, published_by_name = NULL
    WHERE id = ${articleId} AND published IS NOT NULL
    RETURNING *, 'draft' AS status`
  if (!row) {
    await getHelpArticle(articleId)
    throw conflict('This article is not published')
  }
  return toArticle(row)
}

export async function deleteHelpArticle(articleId: number): Promise<HelpArticleSummary> {
  const sql = await db()
  const [row] = await sql<ArticleRow[]>`
    DELETE FROM help_articles WHERE id = ${articleId} RETURNING *, ${sql.unsafe(STATUS)} AS status`
  if (!row) throw notFound('Article')
  return toSummary(row)
}

export async function listHelpRevisions(articleId: number): Promise<HelpRevision[]> {
  const sql = await db()
  await getHelpArticle(articleId)
  const rows = await sql<{ id: string; title: string; published_at: Date; published_by_name: string }[]>`
    SELECT id, content->>'title' AS title, published_at, published_by_name
    FROM help_revisions WHERE article_id = ${articleId} ORDER BY published_at DESC LIMIT 50`
  return rows.map((r) => ({
    id: Number(r.id),
    title: r.title,
    publishedAt: r.published_at.toISOString(),
    publishedByName: r.published_by_name
  }))
}

// ---------------------------------------------------------------------------------------------------
// The public help site

// Published articles only, plus the help site's settings from Admin > Appearance (HELP_SITE_FIELDS).
export async function loadPublicHelp(): Promise<PublicHelp> {
  const sql = await db()
  const [site, categories, articles] = await Promise.all([
    loadSite(),
    listHelpCategories(),
    sql<(Pick<ArticleRow, 'category_id' | 'slug' | 'game' | 'section' | 'sort_order' | 'created_by_name'> & {
      published: HelpContent
      published_at: Date
    })[]>`
      SELECT category_id, slug, game, section, sort_order, published, published_at, created_by_name
      FROM help_articles WHERE published IS NOT NULL
      ORDER BY category_id, section, sort_order, published->>'title'`
  ])

  const slugById = new Map(categories.map((c) => [c.id, c.slug]))
  return {
    site: Object.fromEntries(HELP_SITE_FIELDS.map((k) => [k, site[k]])) as HelpSiteSettings,
    categories: categories.map(({ id: _id, articleCount: _count, ...c }) => c),
    articles: articles.map((a) => ({
      categorySlug: slugById.get(Number(a.category_id))!,
      slug: a.slug,
      game: a.game,
      section: a.section,
      sortOrder: a.sort_order,
      title: a.published.title,
      summary: a.published.summary,
      body: a.published.body,
      authorName: a.created_by_name,
      updatedAt: a.published_at.toISOString()
    }))
  }
}

// Asks Vercel to rebuild the public help site, if a deploy hook is set (NUXT_HELP_DEPLOY_HOOK).
// A failure is logged and never blocks the change that caused it.
export async function rebuildHelpSite(reason: string): Promise<void> {
  const hook = useRuntimeConfig().helpDeployHook
  if (!hook) return
  try {
    await $fetch(hook, { method: 'POST' })
  } catch (err) {
    console.error(`help site rebuild failed (${reason})`, err)
  }
}

// For changes the public site shows: record who did it in the activity log, then rebuild the site.
export async function helpSiteChanged(actor: Actor, action: string, detail: Record<string, unknown>) {
  await logEvent(actor, action, detail)
  await rebuildHelpSite(action)
}
