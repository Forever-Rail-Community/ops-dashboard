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
  if (to.path.startsWith('/updates') && !user.value.permissions.includes('updates.post')) {
    return navigateTo('/')
  }

  // Entering a game's section remembers that game; "/" then goes straight back to it instead of the picker. A game page
  // this person's role can't use sends them to the first one it can (or the picker), so nobody lands on an empty page.
  const { remembered, remember } = useGame()
  const section = to.path.split('/')[1]
  const permissions = user.value.permissions
  const firstPage = (key: GameKey) => visibleFeatures(gameByKey(key), permissions)[0]?.to
  if (isGameKey(section)) {
    remember(section)
    const feature = gameByKey(section).features.find((f) => f.to === to.path)
    if (feature && !permissions.includes(feature.permission)) return navigateTo(firstPage(section) ?? '/')
  } else if (to.path === '/' && isGameKey(remembered.value)) {
    const page = firstPage(remembered.value)
    if (page) return navigateTo(page)
  }
})
