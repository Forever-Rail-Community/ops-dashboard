// Remembers the last page someone used outside of tickets, so a ticket can tell staff where the problem was
// (see pages/tickets/new.vue). Kept for this visit only.
export default defineNuxtPlugin(() => {
  const last = useLastPage()
  const router = useRouter()
  const note = (path: string) => {
    if (!path.startsWith('/tickets')) last.value = path
  }
  // The first page once the router has settled on it (before that, the current route is a placeholder "/").
  router.isReady().then(() => note(router.currentRoute.value.path))
  router.afterEach((to) => note(to.path))
})
