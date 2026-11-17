// Where the Railroader signals stand, the track each block covers and each switch's legs, merged across servers. Big and rarely
// changing, so it's fetched separately from the live data: the map asks again when signalLayoutVersion changes,
// with that version in the URL, so the browser can cache each version.
export default defineEventHandler(async (event): Promise<RailroaderSignalLayout> => {
  await requirePermission(event, 'map.view')
  const reports = await latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return {
    signals: reports.flatMap(({ stored }) => stored.data.signals),
    blocks: reports.flatMap(({ stored }) => stored.data.blocks),
    // Stored before signals mod 0.2 reports have none.
    switchLegs: Object.assign({}, ...reports.map(({ stored }) => stored.data.switchLegs ?? {}))
  }
})
