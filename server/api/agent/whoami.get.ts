// Lets the agent's setup check a key before saving it: which server it belongs to, and that server's game.
export default defineEventHandler(async (event) => {
  const { id, game } = await requireAgent(event)
  return { server: id, game }
})
