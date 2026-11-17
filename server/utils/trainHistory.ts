// Where each Railroader train has been in the last HISTORY_MINUTES, so a train's card can show the grade it actually
// ran over. A sample of every train is taken from a "trains" report at most every SAMPLE_SEC per server, and old
// samples are dropped at the same time: one database statement per report, and nothing extra in Redis.

const HISTORY_MINUTES = 30
const SAMPLE_SEC = 20

export async function recordTrainHistory(agentId: string, trains: TrainReport[]) {
  const rows = trains.flatMap((t) =>
    t.track ? [{ train_id: t.id, segment: t.track.segment, track_end: t.track.end, distance: t.track.distance, speed_mph: t.speedMph, x: t.x, z: t.z }] : []
  )
  if (!rows.length) return
  const sql = await db()
  await sql`
    WITH due AS (
      SELECT NOT EXISTS (
        SELECT 1 FROM train_history WHERE agent_id = ${agentId} AND at > now() - make_interval(secs => ${SAMPLE_SEC})
      ) AS yes
    ), expired AS (
      DELETE FROM train_history WHERE (SELECT yes FROM due) AND at < now() - make_interval(mins => ${HISTORY_MINUTES})
    )
    INSERT INTO train_history (agent_id, train_id, segment, track_end, distance, speed_mph, x, z)
    SELECT ${agentId}, r.train_id, r.segment, r.track_end, r.distance, r.speed_mph, r.x, r.z
    FROM jsonb_to_recordset(${sql.json(rows)})
      AS r(train_id text, segment text, track_end text, distance real, speed_mph real, x real, z real)
    WHERE (SELECT yes FROM due)`
}

export async function readTrainHistory(agentId: string, trainId: string): Promise<TrainHistory> {
  const sql = await db()
  const rows = await sql<{ at: Date; segment: string; track_end: 'A' | 'B'; distance: number; speed_mph: number; x: number; z: number }[]>`
    SELECT at, segment, track_end, distance, speed_mph, x, z FROM train_history
    WHERE agent_id = ${agentId} AND train_id = ${trainId} AND at > now() - make_interval(mins => ${HISTORY_MINUTES})
    ORDER BY at`
  return {
    minutes: HISTORY_MINUTES,
    samples: rows.map((r) => ({
      at: r.at.getTime(),
      track: { segment: r.segment, end: r.track_end, distance: r.distance },
      speedMph: r.speed_mph,
      x: r.x,
      z: r.z
    }))
  }
}
