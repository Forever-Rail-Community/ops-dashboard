// The always-on bot asks where to catch up after a restart (bot/README.md).
export default defineEventHandler(async (event) => {
  requireBotSecret(event)
  return threadsToCatchUp()
})
