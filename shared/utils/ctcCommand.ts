// Commands from the CTC board to the game (FOR-16), as the host mod's `ctc` command takes them (railroader-tools
// host/src/CtcCommands.cs):
//   clear  a control point signal, lining its switch first for the track the signal stands on (or as it is)
//   stop   a control point's signals
//   throw  a control point's switch
// Clicks on the board make these directly; typed ones are read by parseTypedCtc.

export type CtcSetting = 'normal' | 'reverse'
export type CtcAction =
  | { kind: 'clear'; signal: string; setting?: CtcSetting }
  | { kind: 'stop'; cp: string }
  | { kind: 'throw'; cp: string; setting: CtcSetting }

const ID = /^[A-Za-z0-9_.-]{1,80}$/
const SETTINGS: CtcSetting[] = ['normal', 'reverse']

// The action from a request body, or null if it isn't one.
export function parseCtcAction(raw: unknown): CtcAction | null {
  const a = (raw ?? {}) as Record<string, unknown>
  const id = (v: unknown) => (typeof v === 'string' && ID.test(v) ? v : null)
  const setting = (v: unknown) => (SETTINGS.includes(v as CtcSetting) ? (v as CtcSetting) : null)
  if (a.kind === 'clear' && id(a.signal)) {
    if (a.setting === undefined) return { kind: 'clear', signal: a.signal as string }
    return setting(a.setting) ? { kind: 'clear', signal: a.signal as string, setting: a.setting as CtcSetting } : null
  }
  if (a.kind === 'stop' && id(a.cp)) return { kind: 'stop', cp: a.cp as string }
  if (a.kind === 'throw' && id(a.cp) && setting(a.setting)) return { kind: 'throw', cp: a.cp as string, setting: a.setting as CtcSetting }
  return null
}

// The host mod's command for it, e.g. "ctc clear wh-ws reverse".
export function ctcCommandText(a: CtcAction): string {
  if (a.kind === 'clear') return ['ctc clear', a.signal, a.setting].filter(Boolean).join(' ')
  if (a.kind === 'stop') return `ctc stop ${a.cp}`
  return `ctc throw ${a.cp} ${a.setting}`
}

// How a sent command reads on the board, e.g. "CLR wh-ws R", from the host mod's command text.
export function ctcCommandLabel(text: string): string {
  const [, kind, id, setting] = text.split(' ')
  const letter = setting === 'reverse' ? ' R' : setting === 'normal' ? ' N' : ''
  if (kind === 'clear') return `CLR ${id}${letter}`
  if (kind === 'stop') return `STOP ${id}`
  if (kind === 'throw') return `SW ${id}${letter}`
  return text
}

// Typed on the board: CLR <signal> [N|R], STOP <control point>, SW <control point> N|R. Null if it isn't one of these.
export function parseTypedCtc(text: string): CtcAction | null {
  const [word, id, letter, extra] = text.trim().split(/\s+/)
  if (!word || !id || extra !== undefined || !ID.test(id)) return null
  const setting = letter === undefined ? undefined : ({ N: 'normal', R: 'reverse' } as const)[letter.toUpperCase() as 'N' | 'R']
  if (letter !== undefined && !setting) return null
  switch (word.toUpperCase()) {
    case 'CLR': return setting ? { kind: 'clear', signal: id, setting } : { kind: 'clear', signal: id }
    case 'STOP': return letter === undefined ? { kind: 'stop', cp: id } : null
    case 'SW': return setting ? { kind: 'throw', cp: id, setting } : null
    default: return null
  }
}
