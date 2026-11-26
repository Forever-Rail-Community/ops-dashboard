// Every line's desks, who's on them, and the last day's desk changes. Takes anyone away too long off their desk first.
export default defineEventHandler(async (event) => {
  await requirePermission(event, ['ctc.view', 'admin.lines'])
  await releaseAwayDispatchers()
  return listDesks()
})
