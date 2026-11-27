// Who has signed in before (the members_seen table). A first sign-in gets the welcome (WelcomeOverlay.vue).

// Records the sign-in, and says whether it's this person's first.
export async function firstSignIn(userId: string): Promise<boolean> {
  const sql = await db()
  const added = await sql`INSERT INTO members_seen (user_id) VALUES (${userId}) ON CONFLICT DO NOTHING RETURNING user_id`
  return added.length > 0
}
