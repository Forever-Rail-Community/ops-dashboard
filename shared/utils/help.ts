import { GAME_KEYS } from './gameKeys'

// Rules for help center content. The editor uses them to show limits; the server enforces them.

// Which game an article is for. 'all' means it applies to every game.
export const HELP_GAMES = [...GAME_KEYS, 'all'] as const
export type HelpGame = (typeof HELP_GAMES)[number]
export const isHelpGame = (value: unknown): value is HelpGame => HELP_GAMES.includes(value as HelpGame)

export const HELP_LIMITS = {
  title: 120,
  summary: 160,
  categoryName: 60,
  categoryDescription: 200,
  section: 60,
  slug: 80,
  bodyBytes: 200_000
} as const

// Lowercase words joined by single dashes, like "joining-a-session".
export const HELP_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// A Lucide icon name, like "book-open". The help site draws it next to the category.
export const HELP_ICON = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Suggests a URL slug from a title: "Can't connect?" becomes "cant-connect".
export function helpSlugFromTitle(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, HELP_LIMITS.slug)
    .replace(/-+$/, '')
}
