// The CTC board's saved lines.
export default defineEventHandler(async (event) => {
  await requirePermission(event, ['ctc.view', 'admin.lines'])
  return listLines()
})
