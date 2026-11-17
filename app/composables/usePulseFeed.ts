import { useDocumentVisibility } from '@vueuse/core'

// What the sign-in page's live background shows: the latest pulse, and cards about what just happened, one at a time.
// The cards come from what changed between polls (a train started or stopped, a signal changed, a game came up).
// When nothing changes, it goes back over what's running, so a quiet railroad still shows life.

export interface PulseCard {
  key: number
  kind: 'train' | 'signal' | 'game' | 'quiet'
  about: string // which train, signal or game: a newer card about it replaces the older one
  title: string
  detail: string
  aspect?: SignalAspect // a signal's, for its lamp color
  place?: PulsePlace // marked on the drawing while the card is the newest
}
type NewCard = Omit<PulseCard, 'key'>

const POLL_MS = 10_000
const EVERY_MS = 3_500 // between cards
const QUIET: NewCard = { kind: 'quiet', about: 'quiet', title: 'The railroad is quiet', detail: 'Nothing running right now' }

// `shown`: how many cards stay on screen at once. It only runs while `on` is true and the tab is visible, so a
// background tab, or a visitor who turned the live background off, costs nothing.
export function usePulseFeed(shown: number, on: Readonly<Ref<boolean>>) {
  const pulse = ref<Pulse | null>(null)
  const cards = ref<PulseCard[]>([])
  // Trains and games first. Busy CTC changes signals all the time, so signals wait their turn and only the
  // latest change for each one is kept.
  const news: NewCard[] = []
  const signalNews = new Map<string, NewCard>()
  let key = 0
  let replay = 0

  const trainCard = (t: PulseTrain, title: string): NewCard => ({
    kind: 'train',
    about: `train:${t.id}`,
    title,
    detail: `${t.speedMph > 0 ? `${t.speedMph} mph near` : 'Near'} ${t.near}, ${t.cars} ${t.cars === 1 ? 'car' : 'cars'}`,
    place: t
  })
  const signalCard = (s: PulseSignal): NewCard => ({
    kind: 'signal', about: `signal:${s.id}`, title: `${s.name}: ${ASPECT_TEXT[s.aspect].toLowerCase()}`, detail: `Signal near ${s.near}`, aspect: s.aspect, place: s
  })
  const gameCard = (g: PulseGame, title = g.name): NewCard => ({ kind: 'game', about: `game:${g.game}`, title, detail: g.detail })

  // What changed since the last pulse. On the first one, everything running counts as news.
  function collect(before: Pulse | null, now: Pulse) {
    for (const g of now.games) {
      const was = before?.games.find((x) => x.game === g.game)
      if (g.up && !was?.up) news.push(gameCard(g, `${g.name} is up`))
      if (!g.up && was?.up) news.push({ ...gameCard(g, `${g.name} went down`), detail: 'Check the server status page for more' })
    }
    for (const t of now.trains) {
      const was = before?.trains.find((x) => x.id === t.id)
      if (!was) news.push(trainCard(t, t.speedMph > 0 ? `${t.name} is rolling` : `${t.name} is waiting`))
      else if (t.speedMph > 0 && was.speedMph === 0) news.push(trainCard(t, `${t.name} departed`))
      else if (t.speedMph === 0 && was.speedMph > 0) news.push(trainCard(t, `${t.name} stopped`))
    }
    // Signals only count as news when they change; what they show on arrival comes up between trains instead.
    for (const s of before ? now.signals : []) {
      const was = before?.signals.find((x) => x.id === s.id)
      if (was && was.aspect !== s.aspect) {
        signalNews.delete(s.id) // re-added at the end, so it waits its turn again
        signalNews.set(s.id, signalCard(s))
      }
    }
  }

  // Something worth showing again when nothing's new: what's running, moving trains and signals.
  function again(): NewCard | undefined {
    const p = pulse.value
    if (!p) return undefined
    if (!p.games.some((g) => g.up) && !p.trains.length) return QUIET
    const pool = [
      ...p.games.filter((g) => g.up).map((g) => gameCard(g)),
      ...p.trains.filter((t) => t.speedMph > 0).map((t) => trainCard(t, t.name)),
      ...p.signals.filter((s) => s.aspect !== 'stop' && s.aspect !== 'unknown').map(signalCard)
    ]
    return pool.length ? pool[replay++ % pool.length] : undefined
  }

  function nextSignal() {
    const [id, card] = signalNews.entries().next().value ?? []
    if (id) signalNews.delete(id)
    return card
  }

  function next() {
    // With no train or game news, take turns between signal changes and what's already running.
    const card = news.shift() ?? (key % 2 ? (nextSignal() ?? again()) : (again() ?? nextSignal()))
    if (!card) return
    // Once something is running, the quiet card goes.
    const kept = cards.value.filter((c) => c.about !== card.about && (card.kind === 'quiet' || c.kind !== 'quiet'))
    cards.value = [...kept, { ...card, key: ++key }].slice(-shown)
  }

  async function poll() {
    const now = await $fetch<Pulse>('/api/public/pulse').catch(() => null)
    if (!now) return
    collect(pulse.value, now)
    pulse.value = now
  }

  let timers: ReturnType<typeof setInterval>[] = []
  function stop() {
    timers.forEach(clearInterval)
    timers = []
  }
  async function start() {
    if (timers.length) return
    timers = [setInterval(poll, POLL_MS), setInterval(next, EVERY_MS)]
    await poll()
    next()
  }
  const visibility = useDocumentVisibility()
  watch([on, visibility], ([isOn, seen]) => (isOn && seen === 'visible' ? start() : stop()))
  onMounted(() => on.value && start())
  onBeforeUnmount(stop)

  const moving = computed(() => pulse.value?.trains.filter((t) => t.speedMph > 0).length ?? 0)
  return { pulse, cards, moving }
}
