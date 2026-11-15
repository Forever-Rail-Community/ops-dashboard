// The tag above each live train: an arrow pointing the way it is heading, its callsign, and its speed while moving.
// Moving trains get a filled tag, stopped ones an outlined tag, matching the arrow on the track.
// Tags that would overlap are stacked upward, with a short line down to their train.
// The layout is shared by drawing and by finding what the pointer is over, so a click on a tag selects its train.

type Ctx = CanvasRenderingContext2D

export interface TrainTag {
  train: LiveTrain
  anchor: Point // the train on screen
  box: [number, number, number, number] // left, top, right, bottom
  moving: boolean
  speed: string // '' when stopped
}

const HEIGHT = 22
const PAD = 7
const ARROW = 10 // width of the arrow at the start of the tag
const GAP = 4 // between the arrow and the text, and the name and the speed
const LIFT = 13 // from the train to the bottom of its tag
const STACK = HEIGHT + 4
const MAX_STACK = 5
const NAME_FONT = `600 12px ${MAP_FONT}`
const SPEED_FONT = `500 11px ${MAP_FONT}`

const overlaps = (a: TrainTag['box'], b: TrainTag['box']) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]

// The first spot that overlaps no tag placed so far: right above the train, then shifted to either side,
// then one row higher, and so on. If every spot is taken, the highest centered one.
function freeSpot(tags: TrainTag[], anchor: Point, width: number): TrainTag['box'] {
  let box: TrainTag['box'] = [0, 0, 0, 0]
  for (let level = 0; level < MAX_STACK; level++) {
    const bottom = anchor[1] - LIFT - level * STACK
    for (const shift of [0, -0.6, 0.6]) {
      const left = anchor[0] - width / 2 + shift * width
      box = [left, bottom - HEIGHT, left + width, bottom]
      if (!tags.some((t) => overlaps(t.box, box))) return box
    }
  }
  const left = anchor[0] - width / 2
  return [left, box[1], left + width, box[3]]
}

export function layoutTrainTags(ctx: Ctx, trains: LiveTrain[], p: ReturnType<typeof projector>, w: number, h: number): TrainTag[] {
  const tags: TrainTag[] = []
  // Moving trains first, so they get the spots nearest their trains.
  const ordered = [...trains].sort((a, b) => Number(isMoving(b)) - Number(isMoving(a)))
  for (const train of ordered) {
    const anchor: Point = [p.x(train.x), p.y(train.z)]
    if (anchor[0] < -80 || anchor[0] > w + 80 || anchor[1] < -40 || anchor[1] > h + 120) continue
    const moving = isMoving(train)
    const speed = moving ? `${Math.round(train.speedMph)} mph` : ''
    ctx.font = NAME_FONT
    let width = PAD + ARROW + GAP + ctx.measureText(train.name).width + PAD
    if (speed) {
      ctx.font = SPEED_FONT
      width += GAP + ctx.measureText(speed).width
    }
    tags.push({ train, anchor, box: freeSpot(tags, anchor, width), moving, speed })
  }
  return tags
}

export function drawTrainTags(ctx: Ctx, tags: TrainTag[], palette: MapPalette) {
  ctx.save()
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  // Lines from each train up to its tag first, so no line crosses another train's tag.
  ctx.strokeStyle = palette.train
  ctx.fillStyle = palette.train
  ctx.lineWidth = 1.5
  for (const { anchor, box } of tags) {
    const cx = (box[0] + box[2]) / 2
    ctx.beginPath()
    ctx.moveTo(anchor[0], anchor[1] - SYMBOL_RADIUS.trainMoving)
    ctx.lineTo(cx, box[3] + 4)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 5, box[3] - 1)
    ctx.lineTo(cx, box[3] + 5)
    ctx.lineTo(cx + 5, box[3] - 1)
    ctx.closePath()
    ctx.fill()
  }

  for (const { train, box, moving, speed } of tags) {
    const [x0, y0, x1, y1] = box
    const fill = moving ? palette.train : palette.outline
    const ink = moving ? palette.onTrain : palette.train

    ctx.beginPath()
    ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 6)
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = palette.train
    ctx.lineWidth = 1.5
    ctx.stroke()

    // The arrow, pointing the way the train is heading (north is up).
    const ay = (y0 + y1) / 2
    ctx.save()
    ctx.translate(x0 + PAD + ARROW / 2, ay)
    ctx.rotate((train.heading * Math.PI) / 180)
    ctx.beginPath()
    ctx.moveTo(0, -5.5)
    ctx.lineTo(4.2, 4)
    ctx.lineTo(0, 2)
    ctx.lineTo(-4.2, 4)
    ctx.closePath()
    ctx.fillStyle = ink
    ctx.fill()
    ctx.restore()

    let x = x0 + PAD + ARROW + GAP
    ctx.fillStyle = ink
    ctx.font = NAME_FONT
    ctx.fillText(train.name, x, ay + 0.5)
    if (speed) {
      x += ctx.measureText(train.name).width + GAP
      ctx.font = SPEED_FONT
      ctx.globalAlpha *= 0.85
      ctx.fillText(speed, x, ay + 0.5)
      ctx.globalAlpha /= 0.85
    }
  }
  ctx.restore()
}

export const tagAt = (tags: TrainTag[], px: number, py: number) =>
  tags.find(({ box }) => px >= box[0] && px <= box[2] && py >= box[1] && py <= box[3])
