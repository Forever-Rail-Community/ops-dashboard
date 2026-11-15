// Game servers post their reports here, signed with their own key from Admin > Servers.
export default defineEventHandler(async (event) => {
  const agent = await requireAgent(event)
  return acceptReport(agent, await readBody(event))
})
