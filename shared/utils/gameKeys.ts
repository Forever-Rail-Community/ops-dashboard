// The games the dashboard supports, as the server and the browser both know them.
// Names, descriptions, and pages for each game live in app/utils/games.ts.
export const GAME_KEYS = ['run8', 'railroader'] as const
export type GameKey = (typeof GAME_KEYS)[number]
export const isGameKey = (value: unknown): value is GameKey => GAME_KEYS.includes(value as GameKey)
