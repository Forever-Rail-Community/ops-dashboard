// Railroader only: whether the game is running, which session is loaded and its join code. Nothing from other games is sent.
export default defineEventHandler(async (event): Promise<GameStatus<RailroaderAgent>> => {
  const { detailed, permissions, reports } = await readStatusReports(event, 'railroader')
  const seesJoinCode = permissions.includes('multiplayer.joinCode')

  const agents = reports.map(({ status, base }) => {
    const rr = status.railroader
    // Members see whether the game is up and what session is loaded; process figures and error text are for staff.
    const railroader: RailroaderReport = {
      process: detailed ? rr.process : { status: rr.process.status, uptimeSec: rr.process.uptimeSec },
      api: rr.api ? { ...rr.api, error: detailed ? rr.api.error : null } : undefined,
      // The join code lets anyone into the railroad, so it goes only to people allowed to see it.
      multiplayer: seesJoinCode ? rr.multiplayer : undefined
    }
    return { ...base, railroader }
  })

  return { detailed, agents }
})
