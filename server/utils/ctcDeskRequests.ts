// Transfer requests and staff takeovers (FOR-17, shared/types/ctcDesks.ts). Open requests and the notices they leave
// are one small copy in Redis, not the database, so the pages that check for them every DESK_REQUEST_POLL_SEC don't
// keep Postgres awake. The desks themselves only change in the database, through handOverDesk, which checks the desk
// is still the holder's; so if two server instances write the copy at once and one request is lost, nothing on the
// line goes wrong, and the one who asked can ask again.
//
// Requests are settled whenever anyone checks: an unanswered request is declined at its deadline; a takeover is handed
// over at its deadline once the holder's page has shown it (seen); and a request for a desk whose holder has changed
// is dropped.

const KEY = 'ctc-desk-requests'
const NOTICE_SEC = 120 // how long a notice waits to be picked up
const bad = (status: number, message: string) => createError({ statusCode: status, statusMessage: message })

interface Copy {
  requests: CtcDeskRequest[]
  notices: CtcDeskNotice[]
}

const read = async (): Promise<Copy> => (await useStorage('data').getItem<Copy>(KEY)) ?? { requests: [], notices: [] }
const write = (copy: Copy) => useStorage('data').setItem(KEY, copy)
const notice = (userId: string, success: boolean, title: string, description: string): CtcDeskNotice =>
  ({ id: crypto.randomUUID(), userId, at: new Date().toISOString(), success, title, description })

// Ask the dispatcher on a desk for it, or (staff, `takeover`) take it over.
export async function requestDesk(id: unknown, user: { id: string; name: string }, takeover: boolean, permissions: string[]) {
  const desk = await findDesk(id)
  if (!desk.holder) throw bad(409, `No one is on duty on ${desk.name}. Clock in instead.`)
  if (desk.holder.userId === user.id) throw bad(409, `You are already on duty on ${desk.name}.`)
  if (takeover && !permissions.includes('ctc.takeover')) throw bad(403, 'Your role cannot take over a desk without a request.')
  const data = await listDesks()
  const line = (await listLines()).find((l) => l.id === desk.lineId)
  const problem = line && deskCoverProblem(deskSpans(line, data.desks.filter((d) => d.lineId === desk.lineId)), desk.id, user.id, deskSettings(data, desk.lineId).maxDesks)
  if (problem) throw bad(409, problem)
  const copy = await settle()
  if (copy.requests.some((r) => r.deskId === desk.id)) throw bad(409, `${desk.name} already has a request open.`)
  const at = new Date()
  copy.requests.push({
    deskId: desk.id,
    deskName: desk.name,
    sound: deskSettings(data, desk.lineId).sound,
    from: { userId: user.id, name: user.name },
    to: { userId: desk.holder.userId, name: desk.holder.name },
    takeover,
    at: at.toISOString(),
    until: new Date(at.getTime() + DESK_REQUEST_SEC * 1000).toISOString(),
    seen: false
  })
  await write(copy)
  await recordDeskChange(desk.lineId, takeover ? 'takeover' : 'request',
    takeover ? `${user.name} started a staff takeover of ${desk.name} from ${desk.holder.name}` : `${user.name} requested ${desk.name} from ${desk.holder.name}`)
}

// The one who asked withdraws, or cancels their takeover.
export async function withdrawRequest(id: unknown, user: { id: string; name: string }) {
  const desk = await findDesk(id)
  const copy = await settle()
  const request = copy.requests.find((r) => r.deskId === desk.id && r.from.userId === user.id)
  if (!request) throw bad(404, `You have no request open for ${desk.name}.`)
  copy.requests = copy.requests.filter((r) => r !== request)
  copy.notices.push(notice(request.to.userId, false, request.takeover ? 'Takeover cancelled' : 'Request withdrawn',
    `${user.name} ${request.takeover ? 'cancelled the takeover of' : 'withdrew the request for'} ${desk.name}. You remain on duty.`))
  await write(copy)
  await recordDeskChange(desk.lineId, 'request', `${user.name} ${request.takeover ? 'cancelled the takeover of' : 'withdrew the request for'} ${desk.name}`)
}

// The dispatcher on the desk approves (or, for a takeover, clocks out now) or declines.
export async function answerRequest(id: unknown, user: { id: string; name: string }, approve: boolean) {
  const desk = await findDesk(id)
  const copy = await settle()
  const request = copy.requests.find((r) => r.deskId === desk.id && r.to.userId === user.id)
  if (!request) throw bad(404, `There is no open request for ${desk.name}.`)
  if (!approve && request.takeover) throw bad(409, 'A staff takeover cannot be declined.')
  copy.requests = copy.requests.filter((r) => r !== request)
  if (approve) {
    await handOver(copy, desk, request)
  } else {
    copy.notices.push(notice(request.from.userId, false, 'Transfer declined', `${user.name} remains on duty on ${desk.name}.`))
    await recordDeskChange(desk.lineId, 'declined', `${user.name} declined the transfer of ${desk.name}`)
  }
  await write(copy)
}

// The holder's page has shown them the request: a takeover may now go ahead at its deadline.
export async function markRequestSeen(id: unknown, user: { id: string }) {
  const copy = await read()
  const request = copy.requests.find((r) => r.deskId === id && r.to.userId === user.id && !r.seen)
  if (!request) return
  request.seen = true
  await write(copy)
}

// Every open request, this dispatcher's notices (handed over once), and whether they're on a desk.
export async function checkRequests(user: { id: string }): Promise<CtcDeskRequestsData> {
  const copy = await settle()
  const mine = copy.notices.filter((n) => n.userId === user.id)
  if (mine.length) {
    copy.notices = copy.notices.filter((n) => n.userId !== user.id)
    await write(copy)
  }
  const onDesk = (await listDesks()).desks.some((d) => d.holder?.userId === user.id)
  return { requests: copy.requests, notices: mine, onDesk }
}

// Settles what's due (see the top), writes the copy if anything changed, and returns it.
async function settle(): Promise<Copy> {
  const copy = await read()
  const before = JSON.stringify(copy)
  const now = Date.now()
  copy.notices = copy.notices.filter((n) => now - Date.parse(n.at) < NOTICE_SEC * 1000)
  if (copy.requests.length) {
    const desks = (await listDesks()).desks
    for (const request of [...copy.requests]) {
      const desk = desks.find((d) => d.id === request.deskId)
      if (desk?.holder?.userId !== request.to.userId) {
        copy.requests = copy.requests.filter((r) => r !== request)
        copy.notices.push(notice(request.from.userId, false, 'Request closed',
          desk ? `${request.to.name} is no longer on duty on ${desk.name}.${desk.holder ? '' : ' It is open: clock in to take it.'}` : 'The desk was removed.'))
        continue
      }
      if (Date.parse(request.until) > now) continue
      if (request.takeover) {
        if (!request.seen) continue // waits until the holder has been shown it, or is clocked out
        copy.requests = copy.requests.filter((r) => r !== request)
        await handOver(copy, desk, request)
      } else {
        copy.requests = copy.requests.filter((r) => r !== request)
        copy.notices.push(
          notice(request.from.userId, false, 'Transfer declined', `${request.to.name} did not respond within ${DESK_REQUEST_SEC} seconds and remains on duty on ${desk.name}.`),
          notice(request.to.userId, false, 'Request expired', `You remain on duty on ${desk.name}.`))
        await recordDeskChange(desk.lineId, 'declined', `The request for ${desk.name} expired. ${request.to.name} remains on duty`)
      }
    }
  }
  if (JSON.stringify(copy) !== before) await write(copy)
  return copy
}

// Moves the desk to the one who asked, and tells both.
async function handOver(copy: Copy, desk: CtcDesk, request: CtcDeskRequest) {
  const { from, to, takeover } = request
  const text = takeover ? `${from.name} took over ${desk.name} (staff). ${to.name} was clocked out` : `${to.name} approved the transfer of ${desk.name} to ${from.name}`
  let moved = false
  try {
    moved = await handOverDesk(desk, to, from, takeover ? 'takeover' : 'transfer', text)
  } catch (err: any) {
    // The one who asked can no longer cover it (they clocked in elsewhere meanwhile).
    const reason = err?.statusMessage ?? 'Please try again.'
    copy.notices.push(
      notice(from.userId, false, takeover ? 'Takeover not completed' : 'Transfer not completed', reason),
      notice(to.userId, false, takeover ? 'Takeover not completed' : 'Transfer not completed', `${from.name} can no longer take ${desk.name}. You remain on duty.`))
    return
  }
  if (!moved) return
  if (takeover) {
    copy.notices.push(
      notice(to.userId, false, 'Clocked out by staff takeover', `${from.name} has taken over ${desk.name}.`),
      notice(from.userId, true, 'Takeover complete', `You are now on duty on ${desk.name}. ${to.name} was clocked out.`))
  } else {
    copy.notices.push(
      notice(to.userId, false, 'Desk transferred', `${desk.name} was transferred to ${from.name}. You are clocked out.`),
      notice(from.userId, true, 'Transfer approved', `${to.name} transferred ${desk.name} to you. You are now on duty.`))
  }
}
