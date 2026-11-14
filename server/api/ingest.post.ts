// Game servers post their reports here, signed with their own key from Admin > Servers.
export default defineEventHandler(async (event) => {
  const header = getHeader(event, 'authorization') ?? ''
  const agent = await agentForKey(header.startsWith('Bearer ') ? header.slice(7) : '')
  if (!agent) {
    throw createError({ statusCode: 401, statusMessage: 'Unknown key. Check AGENT_KEY, or make a new key in Admin > Servers.' })
  }
  return acceptReport(agent, await readBody(event))
})
