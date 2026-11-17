export default defineNuxtRouteMiddleware(async (to) => {
  const { loggedIn, user, clear } = useUserSession()

  if (to.path === '/login') return loggedIn.value ? navigateTo('/') : undefined
  if (!loggedIn.value) return navigateTo('/login')

  // Sessions from before roles were stored in the database need a fresh sign-in.
  if (!Array.isArray(user.value?.permissions)) {
    await clear()
    return navigateTo('/login')
  }

  // The server checks permissions again on every request; this only keeps people off pages that would be empty.
  if (to.path.startsWith('/admin') && !user.value.permissions.some((p) => p.startsWith('admin.'))) {
    return navigateTo('/')
  }
  if (to.path.startsWith('/help') && !user.value.permissions.includes('help.edit')) {
    return navigateTo('/')
  }

  // Entering a game's section remembers that game; "/" then goes straight back to it instead of the picker.
  const { remembered, remember } = useGame()
  const section = to.path.split('/')[1]
  if (isGameKey(section)) remember(section)
  else if (to.path === '/' && isGameKey(remembered.value)) return navigateTo(`/${remembered.value}`)
})
