// Run8 only: the route servers each Run8 agent watches. Nothing from other games is sent.
export default defineEventHandler(async (event): Promise<GameStatus<Run8Agent>> => {
  const { detailed, reports } = await readStatusReports(event, 'run8')

  const agents = reports.map(({ status, base }) => ({
    ...base,
    // Members see whether each route is up and for how long; process figures are for staff.
    routes: status.routes.map((r) =>
      detailed ? r : { name: r.name, port: r.port, status: r.status, uptimeSec: r.uptimeSec }
    ),
    unmapped: detailed ? status.unmapped : []
  }))

  return { detailed, agents }
})
