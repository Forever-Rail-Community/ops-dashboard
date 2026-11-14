// Railroader only: whether the game is running and which session is loaded. Nothing from other games is sent.
export default defineEventHandler(async (event): Promise<GameStatus<RailroaderAgent>> => {
  const { detailed, reports } = await readStatusReports(event, 'railroader')

  const agents = reports.map(({ status, base }) => {
    const rr = status.railroader
    // Members see whether the game is up and what session is loaded; process figures and error text are for staff.
    const railroader: RailroaderReport = {
      process: detailed ? rr.process : { status: rr.process.status, uptimeSec: rr.process.uptimeSec },
      api: rr.api ? { ...rr.api, error: detailed ? rr.api.error : null } : undefined
    }
    return { ...base, railroader }
  })

  return { detailed, agents }
})
