// Feature requests, with vote counts and whether you voted. Staff also see hidden ones.
export default defineEventHandler(async (event): Promise<FeatureRequest[]> => {
  const { user } = await requireUserSession(event)
  const staff = (await livePermissions(user)).includes('roadmap.manage')
  return listRequests(user.id, staff)
})
