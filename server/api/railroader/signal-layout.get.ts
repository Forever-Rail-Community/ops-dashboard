// Where the Railroader signals stand, the track each block covers, each switch's legs and the CTC control points,
// merged across servers. Big and rarely
// changing, so it's fetched separately from the live data: the map asks again when signalLayoutVersion changes,
// with that version in the URL, so the browser can cache each version.
export default defineEventHandler(async (event): Promise<RailroaderSignalLayout> => {
  await requirePermission(event, ['map.view', 'ctc.view'])
  const reports = await latestReports<RailroaderSignalLayout>('railroader', 'signallayout', Infinity)
  setHeader(event, 'Cache-Control', 'private, max-age=3600')
  return {
    signals: reports.flatMap(({ stored }) => stored.data.signals),
    blocks: reports.flatMap(({ stored }) => stored.data.blocks),
    // Stored before signals mod 0.2 reports have none.
    switchLegs: Object.assign({}, ...reports.map(({ stored }) => stored.data.switchLegs ?? {})),
    // Stored before agent 0.15 reports have none.
    controlPoints: reports.flatMap(({ stored }) => stored.data.controlPoints ?? [])
  }
})
