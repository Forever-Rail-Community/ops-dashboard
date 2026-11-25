// CTC board alerts (FOR-17): a train heading for a control point signal at stop, and one stopped at it too long.
// Worked out on the board from the live data it already has: which blocks are occupied, each signal's aspect, and
// where each train is, which way it's heading and how fast.

export const ALERT_WAIT_MIN = 3 // stopped at a signal at stop this long becomes a "waiting" alert
const NEAR_BLOCK_M = 25 // a train this close to a block's track is in it
const STOPPED_MPH = 1
const FACING = 0.3 // how closely a train's heading must match a signal's direction to be heading for it

export interface CtcAlert {
  signal: string
  cp: string
  x: number // where the signal is drawn on the board
  train: string
  waiting: boolean // stopped there for ALERT_WAIT_MIN or more
  since: number // when this train was first seen at this signal (ms)
}

// The alerts now. `since` keeps when each was first seen, by signal and train, between calls (the page keeps it).
export function ctcAlerts(
  board: Board,
  layout: RailroaderSignalLayout,
  aspects: Record<string, SignalAspect>,
  occupied: Record<string, boolean>,
  trains: LiveTrain[],
  since: Map<string, number>,
  now = Date.now()
): CtcAlert[] {
  const blocks = new Map(layout.blocks.map((b) => [b.id, b]))
  const signals = new Map(layout.signals.map((s) => [s.id, s]))
  const inBlock = (id: string, t: LiveTrain) =>
    blocks.get(id)?.track.some((piece) => piece.some(([x, z]) => Math.hypot(x - t.x, z - t.z) <= NEAR_BLOCK_M)) ?? false
  const alerts: CtcAlert[] = []
  const seen = new Set<string>()
  for (const head of board.heads) {
    if (head.intermediate || !head.cp || !head.approach || !occupied[head.approach]) continue
    if ((aspects[head.signal] ?? 'stop') !== 'stop') continue
    const sig = signals.get(head.signal)
    if (!sig || (!sig.dx && !sig.dz)) continue
    // Heading in degrees clockwise from north, x east and z north: (sin, cos).
    const train = trains.find((t) => inBlock(head.approach!, t) &&
      Math.sin((t.heading * Math.PI) / 180) * sig.dx + Math.cos((t.heading * Math.PI) / 180) * sig.dz > FACING)
    if (!train) continue
    const key = `${head.signal}|${train.id}`
    seen.add(key)
    const first = since.get(key) ?? now
    since.set(key, first)
    const stopped = train.speedMph < STOPPED_MPH
    alerts.push({ signal: head.signal, cp: head.cp, x: head.x, train: train.name, waiting: stopped && now - first >= ALERT_WAIT_MIN * 60_000, since: first })
  }
  for (const key of since.keys()) if (!seen.has(key)) since.delete(key)
  return alerts
}
