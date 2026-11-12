// The sign-in cookie holds a copy of your permissions from when you signed in. Every time the browser asks for
// the session, replace that copy with the current permissions from the database, so a new permission
// (or a role change) shows up in the sidebar straight away without signing in again.
// If the database can't be reached, keep the copy from the cookie. It only decides what is shown;
// the server checks permissions again on every request.
export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session) => {
    if (!session.user) return
    try {
      session.user.permissions = await livePermissions(session.user)
    } catch (err) {
      console.error('could not refresh session permissions', err)
    }
  })
})
