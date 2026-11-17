// For the What's new editor: every update (drafts included), whether Discord posting is set up, the areas a change
// can be in, and completed roadmap items not yet in an update.
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'updates.post')
  const [updates, completed] = await Promise.all([listAllUpdates(), listUnshippedComplete()])
  return { updates, discord: discordEnabled('announcements'), areas: UPDATE_AREAS, completed }
})
