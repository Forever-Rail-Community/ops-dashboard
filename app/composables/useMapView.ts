// The map's camera: where it is looking, how far in, and the moves that change it (zoom, pan, fly to a place).

const MAX_SCALE = 3 // pixels per world unit
const FLY_MS = 350

export function useMapView(bounds: MapData['bounds']) {
  const view = reactive<MapViewState>({ cx: 0, cz: 0, s: 1, w: 0, h: 0, fit: 1 })
  let moved = false // once the person has moved the map, resizing the window no longer re-fits it
  let flight = 0

  const clampScale = (s: number) => Math.min(Math.max(s, view.fit * 0.7), MAX_SCALE)

  function reset() {
    moved = false
    view.cx = (bounds[0] + bounds[2]) / 2
    view.cz = (bounds[1] + bounds[3]) / 2
    view.s = view.fit
  }

  function resize(w: number, h: number) {
    view.w = w
    view.h = h
    view.fit = fitScale(bounds, w, h)
    if (!moved) reset()
  }

  function panBy(dxPx: number, dyPx: number) {
    moved = true
    view.cx -= dxPx / view.s
    view.cz += dyPx / view.s
  }

  // Zoom keeping the world point under (px, py) where it is.
  function zoomAt(px: number, py: number, factor: number) {
    moved = true
    const p = projector(view)
    const wx = p.worldX(px)
    const wz = p.worldZ(py)
    view.s = clampScale(view.s * factor)
    view.cx = wx - (px - view.w / 2) / view.s
    view.cz = wz + (py - view.h / 2) / view.s
  }

  function zoomCenter(factor: number) {
    zoomAt(view.w / 2, view.h / 2, factor)
  }

  function flyTo(x: number, z: number, scale: number) {
    moved = true
    cancelAnimationFrame(flight)
    const from = { ...view }
    const toScale = clampScale(scale)
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / FLY_MS)
      const ease = 1 - (1 - t) ** 3
      view.cx = from.cx + (x - from.cx) * ease
      view.cz = from.cz + (z - from.cz) * ease
      view.s = from.s * (toScale / from.s) ** ease
      if (t < 1) flight = requestAnimationFrame(step)
    }
    flight = requestAnimationFrame(step)
  }

  onBeforeUnmount(() => cancelAnimationFrame(flight))

  return { view, reset, resize, panBy, zoomAt, zoomCenter, flyTo }
}
