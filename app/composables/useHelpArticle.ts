import { toast } from 'vue-sonner'

// State and actions for the article editor page: autosave the draft, publish, discard changes, unpublish,
// delete. `loaded` is the article as fetched by the page, or null for a new article. This runs without
// awaiting anything, so its watchers and cleanup belong to the page that calls it.
//
// Saving: an existing article's draft saves itself a moment after you stop typing. A new article is
// created by its first save (Save draft or Ctrl+S); autosave takes over from then on.

export type HelpArticleForm = Omit<HelpArticleInput, 'baseUpdatedAt'>

// saved: the server has everything. unsaved: edits are waiting to save. saving: a save is running.
// failed: the last save didn't work; the next edit (or Retry) tries again.
// conflict: someone else saved meanwhile; autosave stops until you reload their version.
export type HelpSaveState = 'saved' | 'unsaved' | 'saving' | 'failed' | 'conflict'

const AUTOSAVE_DELAY_MS = 1500

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const formOf = (a: HelpArticle): HelpArticleForm =>
  clone({ categoryId: a.categoryId, slug: a.slug, game: a.game, section: a.section, sortOrder: a.sortOrder, draft: a.draft })

const blankForm = (categoryId: number): HelpArticleForm => ({
  categoryId,
  slug: '',
  game: 'all',
  section: '',
  sortOrder: 0,
  draft: { title: '', summary: '', body: clone(EMPTY_HELP_DOC) }
})

const reason = (err: any) => err?.data?.statusMessage ?? 'Try again.'
const isConflict = (err: any) => err?.statusCode === 409 && reason(err).includes('saved this article')

export function useHelpArticle(loaded: HelpArticle | null, firstCategoryId: number | undefined) {
  const isNew = loaded === null
  const article = ref<HelpArticle | null>(loaded)

  const form = reactive<HelpArticleForm>(loaded ? formOf(loaded) : blankForm(firstCategoryId ?? 0))
  const savedJson = ref(JSON.stringify(form)) // the form as the server last saved it
  const dirty = computed(() => JSON.stringify(form) !== savedJson.value)
  const saveState = ref<HelpSaveState>('saved')
  const busy = ref(false) // publish, unpublish, discard, or delete is running

  // Why the draft can't be saved yet, in words, or null. The server would refuse these anyway.
  const saveProblem = computed(() => {
    if (!form.draft.title.trim()) return 'Add a title to save'
    if (!HELP_SLUG.test(form.slug)) return 'Fix the web address to save'
    return null
  })

  // Live on the help site, with edits that aren't. Drives the "unpublished changes" bar.
  const unpublishedChanges = computed(() => !!article.value?.published && (article.value.status === 'changed' || dirty.value))

  // A new article's web address follows its title until someone edits the address by hand.
  const slugTouched = ref(!isNew)
  watch(() => form.draft.title, (title) => {
    if (!slugTouched.value) form.slug = helpSlugFromTitle(title)
  })

  // The server now has `sent`. The form is left alone: typing may have continued while the save ran.
  function remember(next: HelpArticle, sent: string) {
    article.value = next
    savedJson.value = sent
  }

  // Replaces the form with the server's copy (after reloading or discarding changes).
  function replaceWith(next: HelpArticle) {
    article.value = next
    Object.assign(form, formOf(next))
    savedJson.value = JSON.stringify(form)
    saveState.value = 'saved'
  }

  // Sends the form once: creates the article the first time, then saves its draft. Returns whether it saved.
  async function send(): Promise<boolean> {
    const sent = JSON.stringify(form)
    const body = JSON.parse(sent) as HelpArticleForm
    const failedBefore = saveState.value === 'failed'
    saveState.value = 'saving'
    try {
      const next = article.value
        ? await $fetch<HelpArticle>(`/api/help/articles/${article.value.id}`, {
            method: 'PUT',
            body: { ...body, baseUpdatedAt: article.value.updatedAt } satisfies HelpArticleInput
          })
        : await $fetch<HelpArticle>('/api/help/articles', { method: 'POST', body })
      remember(next, sent)
      saveState.value = dirty.value ? 'unsaved' : 'saved'
      return true
    } catch (err: any) {
      if (isConflict(err)) {
        saveState.value = 'conflict'
        return false
      }
      saveState.value = 'failed'
      if (!failedBefore) toast.error('Could not save', { description: reason(err) }) // once, not on every retry
      return false
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  let running: Promise<boolean> | null = null

  // Saves any unsaved edits now, waiting for a save that is already running. Keeps going until edits made
  // during a save are saved too. Resolves true once the server has everything.
  async function flush(): Promise<boolean> {
    clearTimeout(timer)
    for (;;) {
      if (running) await running
      if (saveState.value === 'conflict') return false
      if (!dirty.value) return true
      if (saveProblem.value) return false
      running = send()
      const ok = await running
      running = null
      if (!ok) return false
    }
  }

  // Autosave: after each edit, save once typing has paused. A new article waits for its first save.
  watch(() => JSON.stringify(form), () => {
    if (!dirty.value || saveState.value === 'conflict') return
    if (saveState.value !== 'saving') saveState.value = 'unsaved'
    if (!article.value) return
    clearTimeout(timer)
    timer = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS)
  })

  // Runs publish, unpublish, discard, or delete with the busy flag and an error toast. Returns false if it failed.
  async function act(action: () => Promise<void>, failure: string) {
    busy.value = true
    try {
      await action()
      return true
    } catch (err: any) {
      toast.error(failure, { description: reason(err) })
      return false
    } finally {
      busy.value = false
    }
  }

  // A new article gets its own address once it has been saved, after everything else is done.
  async function moveToSavedAddress() {
    if (isNew && article.value) await navigateTo(`/help/${article.value.id}`, { replace: true })
  }

  // Save draft / Ctrl+S: saves right away instead of waiting for autosave.
  async function save(): Promise<boolean> {
    const ok = await flush()
    if (ok && isNew) toast.success('Draft saved')
    await moveToSavedAddress()
    return ok
  }

  // Saves first, so what you see is what goes live.
  async function publish(): Promise<boolean> {
    const ok =
      (await flush()) &&
      (await act(async () => {
        remember(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/publish`, { method: 'POST' }), savedJson.value)
        toast.success('Published. The help site will update in about a minute.')
      }, 'Could not publish'))
    await moveToSavedAddress()
    return ok
  }

  async function discard() {
    if (!article.value || !confirm('Discard your unpublished changes and go back to the live version?')) return
    clearTimeout(timer)
    if (running) await running
    await act(async () => {
      replaceWith(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/discard`, { method: 'POST' }))
      toast.success('Changes discarded')
    }, 'Could not discard the changes')
  }

  // Brings in the latest saved version, for example after someone else saved it.
  async function reload() {
    if (!article.value) return
    clearTimeout(timer)
    await act(async () => replaceWith(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}`)), 'Could not reload')
  }

  async function unpublish() {
    if (!article.value || !confirm('Take this article off the help site? The draft and its history are kept.')) return
    if (!(await flush())) return
    await act(async () => {
      remember(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/unpublish`, { method: 'POST' }), savedJson.value)
      toast.success('Unpublished')
    }, 'Could not unpublish')
  }

  // Features the article on the help site's home page, or stops. Independent of the draft, so no save first.
  async function feature(featured: boolean) {
    if (!article.value) return
    await act(async () => {
      remember(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/feature`, { method: 'POST', body: { featured } }), savedJson.value)
      toast.success(featured ? 'Featured on the help site home page' : 'No longer featured')
    }, featured ? 'Could not feature the article' : 'Could not stop featuring the article')
  }

  async function remove() {
    if (!article.value || !confirm(`Delete "${article.value.title}" and its history? This can't be undone.`)) return
    clearTimeout(timer)
    if (running) await running
    const deleted = await act(async () => {
      await $fetch(`/api/help/articles/${article.value!.id}`, { method: 'DELETE' })
      savedJson.value = JSON.stringify(form) // nothing left to save
      toast.success('Article deleted')
    }, 'Could not delete')
    if (deleted) await navigateTo('/help')
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return {
    isNew, article, form, dirty, busy, saveState, saveProblem, unpublishedChanges, slugTouched,
    save, flush, publish, discard, reload, unpublish, feature, remove
  }
}
