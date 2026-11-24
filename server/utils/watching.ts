// Whether anyone has a page open that shows a game's live data (the map, the Overview). Game servers send less
// often while nobody does, which keeps Redis use down. Pages that show live data call markWatching on each refresh;
// the reply to each report tells the agent whether anyone is watching.

const WATCH_SEC = 90 // a viewer counts for this long after their last refresh
const MARK_EVERY_MS = 30_000 // refreshes in between don't write again (counted per server instance)
const key = (game: GameKey) => `watching:${game}`
const lastMarked = new Map<GameKey, number>()

export async function markWatching(game: GameKey) {
  const now = Date.now()
  if (now - (lastMarked.get(game) ?? 0) < MARK_EVERY_MS) return
  lastMarked.set(game, now)
  await useStorage('data').setItem(key(game), now)
}

export async function isWatched(game: GameKey): Promise<boolean> {
  const at = await useStorage('data').getItem<number>(key(game))
  return typeof at === 'number' && Date.now() - at < WATCH_SEC * 1000
}
