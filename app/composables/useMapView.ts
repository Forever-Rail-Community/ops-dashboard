import { useDebounceFn } from '@vueuse/core'

// The map's camera: where it is looking, how far in, and the moves that change it (zoom, pan, fly to a place).

const MAX_SCALE = 12 // pixels per world unit: close enough to see rails and ties
const FLY_MS = 350

// Where the map was last left, per browser. Only a convenience: if it can't be read, the map shows the whole railroad.
interface SavedView {
  cx: number
  cz: number
  s: number
}

function readSaved(key: string): SavedView | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null')
    return saved && [saved.cx, saved.cz, saved.s].every(Number.isFinite) ? saved : null
  } catch {
    return null
  }
}

// `rememberAs` names the saved view; without it the map always opens on the whole railroad.
export function useMapView(bounds: MapData['bounds'], rememberAs?: string) {
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
    const first = !view.w
    view.w = w
    view.h = h
    view.fit = fitScale(bounds, w, h)
    const saved = first && rememberAs ? readSaved(rememberAs) : null
    if (saved) {
      moved = true
      Object.assign(view, { cx: saved.cx, cz: saved.cz, s: clampScale(saved.s) })
    } else if (!moved) {
      reset()
    }
  }

  if (rememberAs) {
    const save = useDebounceFn(() => {
      try {
        localStorage.setItem(rememberAs, JSON.stringify({ cx: view.cx, cz: view.cz, s: view.s }))
      } catch {
        // Storage can be unavailable (private windows); the map just won't reopen here.
      }
    }, 500)
    watch(() => [view.cx, view.cz, view.s], () => view.w && save())
  }

  // Keeps the zoom and moves the center, as when following a train.
  function centerOn(x: number, z: number) {
    flyTo(x, z, view.s)
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

  return { view, reset, resize, panBy, zoomAt, zoomCenter, flyTo, centerOn }
}
