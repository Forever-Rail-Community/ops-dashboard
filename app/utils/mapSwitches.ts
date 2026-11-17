// Which way each switch is lined, shown on the track itself: the piece it isn't lined for is drawn faint, so the
// lined route is the one continuous line. The position comes from the tracker pack; which piece is normal and
// which reverse comes from the signals mod (0.2 or newer).

// The map's index for the piece each switch isn't lined for, by the game's switch id. A switch whose position or
// legs aren't reported, or whose pieces aren't in the map data, is left out.
export function unlinedPieces(map: MapData, legs: Record<string, [string, string]>, thrown: Record<string, boolean>) {
  const unlined = new Map<string, number>()
  for (const id of map.switchIds) {
    const state = thrown[id]
    const pair = legs[id]
    if (state === undefined || !pair) continue
    const piece = pieceById(map, state ? pair[0] : pair[1])
    if (piece !== undefined) unlined.set(id, piece)
  }
  return unlined
}
