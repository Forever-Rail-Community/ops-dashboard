// Where one live train has been lately: ?agent=<server id>&train=<train id>, as in the live trains list.
export default defineEventHandler(async (event): Promise<TrainHistory> => {
  await requirePermission(event, 'map.view')
  await markWatching('railroader')
  const { agent, train } = getQuery(event)
  if (typeof agent !== 'string' || typeof train !== 'string' || !agent || !train || agent.length > 100 || train.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Give the agent and train ids' })
  }
  return readTrainHistory(agent, train)
})
