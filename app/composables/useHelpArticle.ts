import { toast } from 'vue-sonner'

// State and actions for the article editor page: load, save the draft, publish, unpublish, delete.
// `id` is an article id, or "new" for an article that hasn't been saved yet.

export type HelpArticleForm = Omit<HelpArticleInput, 'baseUpdatedAt'>

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

export async function useHelpArticle(id: string, firstCategoryId: () => number | undefined) {
  const isNew = id === 'new'
  const article = ref<HelpArticle | null>(null)

  if (!isNew) {
    const { data, error } = await useFetch<HelpArticle>(`/api/help/articles/${id}`, { key: `help-article-${id}` })
    if (error.value || !data.value) {
      throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Article not found', fatal: true })
    }
    article.value = data.value
  }

  const form = reactive<HelpArticleForm>(article.value ? formOf(article.value) : blankForm(firstCategoryId() ?? 0))
  const savedJson = ref(JSON.stringify(form))
  const dirty = computed(() => JSON.stringify(form) !== savedJson.value)
  const busy = ref(false)

  // A new article's web address follows its title until someone edits the address by hand.
  const slugTouched = ref(!isNew)
  watch(() => form.draft.title, (title) => {
    if (!slugTouched.value) form.slug = helpSlugFromTitle(title)
  })

  function accept(next: HelpArticle) {
    article.value = next
    Object.assign(form, formOf(next))
    savedJson.value = JSON.stringify(form)
  }

  async function reload() {
    if (!article.value) return
    accept(await $fetch<HelpArticle>(`/api/help/articles/${article.value.id}`))
  }

  // Runs one request with the busy flag and a toast. Returns false if it failed.
  async function attempt(action: () => Promise<void>, failure: string) {
    busy.value = true
    try {
      await action()
      return true
    } catch (err: any) {
      if (err?.statusCode === 409 && article.value && reason(err).includes('saved this article')) {
        toast.error(failure, { description: reason(err), action: { label: 'Reload', onClick: () => reload() } })
      } else {
        toast.error(failure, { description: reason(err) })
      }
      return false
    } finally {
      busy.value = false
    }
  }

  // Creates the article on its first save, otherwise saves the draft.
  function saveDraft() {
    return attempt(async () => {
      const next = article.value
        ? await $fetch<HelpArticle>(`/api/help/articles/${article.value.id}`, {
            method: 'PUT',
            body: { ...form, baseUpdatedAt: article.value.updatedAt } satisfies HelpArticleInput
          })
        : await $fetch<HelpArticle>('/api/help/articles', { method: 'POST', body: form })
      accept(next)
      toast.success('Draft saved')
    }, 'Could not save')
  }

  // A new article gets its own address once it has been saved, after everything else is done.
  async function moveToSavedAddress() {
    if (isNew && article.value) await navigateTo(`/help/${article.value.id}`, { replace: true })
  }

  async function save(): Promise<boolean> {
    const ok = await saveDraft()
    await moveToSavedAddress()
    return ok
  }

  // Saves first if there are unsaved edits, so what you see is what goes live.
  async function publish(): Promise<boolean> {
    const ok =
      (!(dirty.value || !article.value) || (await saveDraft())) &&
      (await attempt(async () => {
        accept(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/publish`, { method: 'POST' }))
        toast.success('Published. The help site will update in about a minute.')
      }, 'Could not publish'))
    await moveToSavedAddress()
    return ok
  }

  async function unpublish() {
    if (!article.value || !confirm('Take this article off the help site? The draft and its history are kept.')) return
    await attempt(async () => {
      accept(await $fetch<HelpArticle>(`/api/help/articles/${article.value!.id}/unpublish`, { method: 'POST' }))
      toast.success('Unpublished')
    }, 'Could not unpublish')
  }

  async function remove() {
    if (!article.value || !confirm(`Delete "${article.value.title}" and its history? This can't be undone.`)) return
    const deleted = await attempt(async () => {
      await $fetch(`/api/help/articles/${article.value!.id}`, { method: 'DELETE' })
      savedJson.value = JSON.stringify(form) // nothing left to lose
      toast.success('Article deleted')
    }, 'Could not delete')
    if (deleted) await navigateTo('/help')
  }

  return { isNew, article, form, dirty, busy, slugTouched, save, publish, unpublish, remove }
}
