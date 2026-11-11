// Turns mouse, touch, wheel and keyboard input on the canvas into map moves.

type MapCamera = Pick<ReturnType<typeof useMapView>, 'view' | 'reset' | 'panBy' | 'zoomAt' | 'zoomCenter'>

interface Callbacks {
  hitAt: (px: number, py: number) => MapHit | null
  onHover: (hit: (MapHit & { sx: number; sy: number }) | null) => void
  onSelect: (hit: MapHit | null) => void
}

const CLICK_SLOP = 5 // pixels of drag that still count as a click
const KEY_STEP = 60 // pixels moved per arrow key

export function useMapPointer(canvas: Ref<HTMLCanvasElement | undefined>, camera: MapCamera, cb: Callbacks) {
  const pointers = new Map<number, { x: number; y: number }>()
  let dragged = 0
  let pinchDistance = 0

  // Position inside the canvas, whatever event it came from.
  const local = (e: { clientX: number; clientY: number }) => {
    const box = canvas.value!.getBoundingClientRect()
    return { x: e.clientX - box.left, y: e.clientY - box.top }
  }

  function pinch() {
    const [a, b] = [...pointers.values()]
    const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y)
    if (pinchDistance) camera.zoomAt((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, distance / pinchDistance)
    pinchDistance = distance
    dragged = Infinity
  }

  function onDown(e: PointerEvent) {
    canvas.value!.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, local(e))
    dragged = 0
    pinchDistance = 0
    if (pointers.size === 2) pinch()
  }

  function onMove(e: PointerEvent) {
    const now = local(e)
    const before = pointers.get(e.pointerId)

    if (!before) {
      const hit = cb.hitAt(now.x, now.y)
      cb.onHover(hit ? { ...hit, sx: now.x, sy: now.y } : null)
      return
    }
    pointers.set(e.pointerId, now)
    if (pointers.size === 2) return pinch()

    dragged += Math.abs(now.x - before.x) + Math.abs(now.y - before.y)
    camera.panBy(now.x - before.x, now.y - before.y)
    cb.onHover(null)
  }

  function onUp(e: PointerEvent) {
    const at = local(e)
    pointers.delete(e.pointerId)
    pinchDistance = 0
    if (dragged < CLICK_SLOP && pointers.size === 0) cb.onSelect(cb.hitAt(at.x, at.y))
  }

  const onWheel = (e: WheelEvent) => camera.zoomAt(local(e).x, local(e).y, Math.exp(-e.deltaY * 0.0015))
  const onDoubleClick = (e: MouseEvent) => camera.zoomAt(local(e).x, local(e).y, 2)

  function onKey(e: KeyboardEvent) {
    const moves: Record<string, () => void> = {
      ArrowLeft: () => camera.panBy(KEY_STEP, 0),
      ArrowRight: () => camera.panBy(-KEY_STEP, 0),
      ArrowUp: () => camera.panBy(0, KEY_STEP),
      ArrowDown: () => camera.panBy(0, -KEY_STEP),
      '+': () => camera.zoomCenter(1.4),
      '=': () => camera.zoomCenter(1.4),
      '-': () => camera.zoomCenter(1 / 1.4),
      '0': camera.reset
    }
    const move = moves[e.key]
    if (!move) return
    move()
    e.preventDefault()
  }

  const onLeave = () => cb.onHover(null)

  return { onDown, onMove, onUp, onLeave, onWheel, onDoubleClick, onKey }
}
