// Every update, drafts included, and whether Discord posting is set up: for the What's new editor.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'updates.post')
  return { updates: await listAllUpdates(), discord: discordUpdatesEnabled(), areas: UPDATE_AREAS }
})
