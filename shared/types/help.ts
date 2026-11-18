import type { HelpGame, HelpSiteSettings } from '../utils/help'

// The editor's document format (Tiptap's JSON). The server only checks its outer shape and size.
export interface HelpDoc {
  type: 'doc'
  content?: unknown[]
}

// The words of an article. Each article has a draft copy and, once published, a published copy.
export interface HelpContent {
  title: string
  summary: string
  body: HelpDoc
}

// draft: never published. published: the public copy matches the draft. changed: published, with unpublished edits.
export type HelpStatus = 'draft' | 'published' | 'changed'

export interface HelpCategory {
  id: number
  slug: string
  name: string
  description: string
  icon: string
  sortOrder: number
  articleCount: number
}

export interface HelpCategoryInput {
  slug: string
  name: string
  description: string
  icon: string
  sortOrder?: number
}

// Where an article lives. Changes to these apply to the public site the next time it rebuilds.
export interface HelpPlacement {
  categoryId: number
  slug: string
  game: HelpGame
  section: string
  sortOrder: number
}

export interface HelpArticleSummary extends HelpPlacement {
  id: number
  title: string // the draft's title
  status: HelpStatus
  updatedAt: string
  updatedByName: string
  publishedAt: string | null
  featuredAt: string | null // when it was featured on the help site's home page; null when it isn't
}

export interface HelpArticle extends HelpArticleSummary {
  draft: HelpContent
  published: HelpContent | null
  createdByName: string
}

export interface HelpArticleInput extends HelpPlacement {
  draft: HelpContent
  // The updatedAt the editor loaded. If someone saved since then, the save is refused instead of overwriting.
  baseUpdatedAt?: string
}

export interface HelpRevision {
  id: number
  title: string
  publishedAt: string
  publishedByName: string
}

// Everything the public help site needs to build, in one response.
export interface PublicHelp {
  site: HelpSiteSettings
  categories: Omit<HelpCategory, 'id' | 'articleCount'>[]
  articles: {
    categorySlug: string
    slug: string
    game: HelpGame
    section: string
    sortOrder: number
    title: string
    summary: string
    body: HelpDoc
    authorName: string
    updatedAt: string
    featuredAt: string | null // featured on the home page since then; null when not featured
  }[]
}
