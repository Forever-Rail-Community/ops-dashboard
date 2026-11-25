// The lines the game's layout describes right now, for setting up the board's lines (Admin > CTC lines).
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin.lines')
  return linesFromGame()
})
