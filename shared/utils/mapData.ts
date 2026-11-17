// The shape of server/assets/map.json. Raise this whenever scripts/build-map.mjs changes what it writes
// (and set the same number there). The map page asks for this version in its URL, so browsers never reuse
// a cached copy in the old shape, and the server refuses to serve a file that wasn't rebuilt.
// 1: first version. 2: node headings and turntable bridges, for curved track.
// 3: the game's ids for track pieces and switches, and the track pieces each industry covers (for live trains).
// 4: each node's height, for grades.
export const MAP_DATA_VERSION = 4
