// The always-on bot forwards each message typed in a ticket thread here (bot/README.md).
export default defineEventHandler(async (event) => {
  requireBotSecret(event)
  return { result: await saveThreadMessage(parseThreadMessage(await readBody(event)), getRequestURL(event).origin) }
})
