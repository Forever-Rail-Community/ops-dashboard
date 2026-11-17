<script setup lang="ts">
import { ArrowLeft, Ellipsis, EyeOff, Trash2 } from '@lucide/vue'
import { useEventListener } from '@vueuse/core'

// A fresh page for every article, so leaving "new" for the saved article's address starts clean.
definePageMeta({ title: 'Help center', key: (route) => route.fullPath })

const route = useRoute()
const id = String(route.params.id)
const { user } = useUserSession()
const canPublish = computed(() => user.value?.permissions?.includes('help.publish') ?? false)

const [{ data: categories }, { data: allArticles }] = await Promise.all([
  useFetch<HelpCategory[]>('/api/help/categories', { key: 'help-categories', default: () => [] }),
  useFetch<HelpArticleSummary[]>('/api/help/articles', { key: 'help-articles', default: () => [] })
])

const { isNew, article, form, dirty, busy, slugTouched, save, publish, unpublish, remove } = await useHelpArticle(
  id,
  () => categories.value[0]?.id
)

const { data: revisions, refresh: refreshRevisions } = await useFetch<HelpRevision[]>(`/api/help/articles/${id}/revisions`, {
  key: `help-revisions-${id}`,
  default: () => [],
  immediate: !isNew
})
watch(() => article.value?.publishedAt, () => { if (article.value) refreshRevisions() })

const categoryId = computed({
  get: () => String(form.categoryId),
  set: (v: string) => { form.categoryId = Number(v) }
})
const categorySlug = computed(() => categories.value.find((c) => c.id === form.categoryId)?.slug ?? '')

// Section names already used in this category, offered as suggestions.
const sections = computed(() => [
  ...new Set(allArticles.value.filter((a) => a.categoryId === form.categoryId && a.section).map((a) => a.section))
])

const status = computed<HelpStatus>(() => {
  const s = article.value?.status ?? 'draft'
  return s === 'published' && dirty.value ? 'changed' : s
})
const canPublishNow = computed(() => !busy.value && form.draft.title.trim() !== '' && status.value !== 'published')
const publishLabel = computed(() => (article.value?.published ? 'Publish changes' : 'Publish'))

const when = (iso: string) => new Date(iso).toLocaleString()

// Ctrl+S / Cmd+S saves the draft.
useEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    if (!busy.value) save()
  }
})

// Don't lose unsaved work by leaving the page or closing the tab.
const LEAVE_WARNING = 'You have unsaved changes. Leave without saving?'
onBeforeRouteLeave(() => (dirty.value ? confirm(LEAVE_WARNING) : true))
useEventListener('beforeunload', (e: BeforeUnloadEvent) => {
  if (dirty.value) e.preventDefault()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" size="sm" class="-ml-2" as-child>
        <NuxtLink to="/help"><ArrowLeft /> Help center</NuxtLink>
      </Button>
      <div class="flex flex-wrap items-center gap-2">
        <HelpStatusBadge :status="status" />
        <span v-if="dirty" class="text-xs text-muted-foreground">Not saved</span>
        <Button variant="outline" :disabled="busy || (!dirty && !isNew)" @click="save">Save draft</Button>
        <Button v-if="canPublish" :disabled="!canPublishNow" @click="publish">{{ publishLabel }}</Button>
        <DropdownMenu v-if="canPublish && article">
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" size="icon" aria-label="More actions"><Ellipsis /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem :disabled="!article.published || busy" @select="unpublish"><EyeOff /> Unpublish</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem class="text-destructive focus:text-destructive" :disabled="busy" @select="remove"><Trash2 /> Delete article</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section class="flex min-w-0 flex-col gap-4" aria-label="Article">
        <div class="grid gap-1">
          <Label for="article-title" class="sr-only">Title</Label>
          <input
            id="article-title"
            v-model="form.draft.title"
            :maxlength="HELP_LIMITS.title"
            placeholder="Article title"
            class="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
          />
        </div>
        <HelpRichText v-model="form.draft.body" />
        <p class="text-xs text-muted-foreground">Ctrl+S (Cmd+S on a Mac) saves the draft. Nothing changes on the help site until you publish.</p>
      </section>

      <aside class="flex flex-col gap-4" aria-label="Article settings">
        <Card>
          <CardHeader><CardTitle class="text-base">Article settings</CardTitle></CardHeader>
          <CardContent class="grid gap-4">
            <div class="grid gap-2">
              <Label>Category</Label>
              <Select v-model="categoryId">
                <SelectTrigger class="w-full" aria-label="Category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <Label for="article-section">Section</Label>
              <Input id="article-section" v-model="form.section" list="article-sections" :maxlength="HELP_LIMITS.section" placeholder="Optional, like Troubleshooting" />
              <datalist id="article-sections">
                <option v-for="s in sections" :key="s" :value="s" />
              </datalist>
              <p class="text-xs text-muted-foreground">Groups articles under a heading inside the category.</p>
            </div>

            <div class="grid gap-2">
              <Label>Game</Label>
              <Select v-model="form.game">
                <SelectTrigger class="w-full" aria-label="Game"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="g in HELP_GAMES" :key="g" :value="g">{{ helpGameName(g) }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid gap-2">
              <Label for="article-summary">Summary</Label>
              <Textarea id="article-summary" v-model="form.draft.summary" :maxlength="HELP_LIMITS.summary" rows="3" />
              <p class="text-xs text-muted-foreground">
                Shown under the title and in search results. {{ form.draft.summary.length }} / {{ HELP_LIMITS.summary }}
              </p>
            </div>

            <div class="grid gap-2">
              <Label for="article-slug">Web address</Label>
              <div class="flex items-center rounded-md border shadow-xs focus-within:ring-3 focus-within:ring-ring/50">
                <span class="max-w-32 truncate border-r bg-muted px-2 py-2 font-mono text-xs text-muted-foreground">/{{ categorySlug }}/</span>
                <input
                  id="article-slug"
                  v-model="form.slug"
                  :maxlength="HELP_LIMITS.slug"
                  class="min-w-0 flex-1 bg-transparent px-2 py-1.5 font-mono text-xs outline-none"
                  @input="slugTouched = true"
                />
              </div>
              <p v-if="article?.published" class="text-xs text-muted-foreground">Changing the address of a published article breaks old links to it.</p>
            </div>

            <div class="grid gap-2">
              <Label for="article-order">Order</Label>
              <Input id="article-order" v-model.number="form.sortOrder" type="number" min="0" max="10000" class="w-28" />
              <p class="text-xs text-muted-foreground">Lower numbers come first within the section.</p>
            </div>
          </CardContent>
        </Card>

        <Card v-if="article">
          <CardHeader><CardTitle class="text-base">History</CardTitle></CardHeader>
          <CardContent class="grid gap-3 text-sm">
            <p class="text-muted-foreground">
              Written by {{ article.createdByName }}. Last saved {{ when(article.updatedAt) }} by {{ article.updatedByName }}.
            </p>
            <p v-if="!revisions.length" class="text-muted-foreground">Not published yet.</p>
            <ul v-else class="grid gap-2">
              <li v-for="(r, i) in revisions" :key="r.id" class="flex flex-col border-b pb-2 last:border-b-0 last:pb-0">
                <span class="font-medium">{{ i === 0 && article.published ? 'Live version' : 'Published' }}</span>
                <span class="text-xs text-muted-foreground">{{ when(r.publishedAt) }} by {{ r.publishedByName }}</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </aside>
    </div>
  </div>
</template>
