// Where each Railroader train has been lately, so a train's card can show the grade it actually ran over.
// The agent on the game server keeps the samples (one about every 20 seconds, for 30 minutes) and sends them while
// someone is watching; the dashboard keeps its latest copy in Redis. Nothing is written to the database.

export async function readTrainHistory(agentId: string, trainId: string): Promise<TrainHistory> {
  const stored = await readReport<RailroaderTrainHistory>('trainhistory', agentId)
  const rows = stored?.data.trains[trainId] ?? []
  return {
    minutes: stored?.data.minutes ?? 30,
    samples: rows.map(([at, segment, end, distance, speedMph, x, z]) => ({ at, track: { segment, end, distance }, speedMph, x, z }))
  }
}
