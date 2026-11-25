import { useTimeoutPoll } from '@vueuse/core'

const FAST_MS = 3_000
const SLOW_MS = 15_000
const UNFINISHED: ServerCommandState[] = ['queued', 'sent', 'pending']

// A list of sent commands and their answers (the Game status controls, the CTC board), refreshed every few seconds
// while one is unanswered and slowly otherwise. `add` puts a just-sent command at the top and speeds up again.
export async function useCommandList(url: MaybeRefOrGetter<string>, key: string) {
  const { data: commands, refresh } = await useFetch<ServerCommand[]>(url, { key, default: () => [] })
  const waiting = computed(() => commands.value.some((c) => UNFINISHED.includes(c.state)))
  const { resume } = useTimeoutPoll(refresh, () => (waiting.value ? FAST_MS : SLOW_MS), { immediate: true })
  function add(command: ServerCommand) {
    commands.value = [command, ...commands.value]
    resume()
  }
  return { commands, add }
}

export const commandTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })
