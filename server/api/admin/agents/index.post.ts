export default defineEventHandler(async (event) => {
  const { user } = await requirePermission(event, 'admin.agents')
  const agent = parseAgentInput(await readBody(event))
  const key = await createAgent(agent, user)
  await logEvent(user, 'agents.create', { id: agent.id, game: agent.game })
  return { key }
})
