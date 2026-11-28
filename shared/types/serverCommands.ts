// Commands staff send to a game server from the Game status page. The dashboard holds each one until the server's
// agent picks it up with its next report; the agent's answers come back with later reports.
//   queued   waiting for the agent          sent     the agent has it
//   pending  the game has started it (a save, a shutdown), with a final answer to come
//   ok / refused / error   the final answer          expired  not picked up within COMMAND_PICKUP_SEC
export type ServerCommandState = 'queued' | 'sent' | 'pending' | 'ok' | 'refused' | 'error' | 'expired'

export interface ServerCommand {
  id: number
  agentId: string
  text: string
  by: string
  at: string // ISO time it was sent from the dashboard
  state: ServerCommandState
  message: string
  sentAt: string | null // when the agent picked it up, if it has
  answeredAt: string | null // when the game last answered, if it has
}

// A command the agent hasn't picked up in this long is dropped, so it never runs by surprise later (the host mod
// drops command files older than 2 minutes the same way).
export const COMMAND_PICKUP_SEC = 120
// A command picked up but not finally answered in this long is shown as unanswered.
export const COMMAND_ANSWER_SEC = 60
