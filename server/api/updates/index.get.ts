// Published updates, newest first, for What's new. Anyone signed in.
export default defineEventHandler(async (event): Promise<Update[]> => {
  await requireUserSession(event)
  return listPublishedUpdates()
})
