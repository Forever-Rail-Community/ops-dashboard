<script setup lang="ts">
import { FilePen, FileText, Folder, Plus, Send } from '@lucide/vue'

definePageMeta({ title: 'Help center' })

const { user } = useUserSession()
const canPublish = computed(() => user.value?.permissions?.includes('help.publish') ?? false)

const [{ data: articles, refresh: refreshArticles }, { data: categories, refresh: refreshCategories }] = await Promise.all([
  useFetch<HelpArticleSummary[]>('/api/help/articles', { key: 'help-articles', default: () => [] }),
  useFetch<HelpCategory[]>('/api/help/categories', { key: 'help-categories', default: () => [] })
])

const published = computed(() => articles.value.filter((a) => a.status !== 'draft').length)
const drafts = computed(() => articles.value.filter((a) => a.status === 'draft').length)
const lastPublished = computed(() =>
  articles.value.filter((a) => a.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!))[0] ?? null
)
const managing = ref(false)

async function onCategoriesChanged() {
  await Promise.all([refreshCategories(), refreshArticles()])
}
</script>

<template>
  <PageBody>
    <PageHeader title="Help center" description="Articles for the public help site.">
      <template v-if="categories.length" #actions>
        <Button as-child><NuxtLink to="/help/new"><Plus />New article</NuxtLink></Button>
      </template>
    </PageHeader>

    <Alert v-if="!categories.length">
      <AlertTitle>Add a category first</AlertTitle>
      <AlertDescription>
        Every article belongs to a category.
        {{ canPublish ? 'Press Manage under Categories to add one.' : 'Ask someone who can publish help articles to add one.' }}
      </AlertDescription>
    </Alert>

    <PageGrid :min="220">
      <PageStatCard :icon="FileText" label="Published">
        <span class="text-[26px] font-semibold tabular-nums">{{ published }}</span>
        <template #detail><span class="text-emerald-600 dark:text-emerald-300">Live on the help site</span></template>
      </PageStatCard>
      <PageStatCard :icon="FilePen" label="Drafts">
        <span class="text-[26px] font-semibold tabular-nums">{{ drafts }}</span>
        <template #detail>Not on the help site yet</template>
      </PageStatCard>
      <PageStatCard :icon="Folder" label="Categories">
        <span class="text-[26px] font-semibold tabular-nums">{{ categories.length }}</span>
        <template #detail>Every article needs one</template>
      </PageStatCard>
      <PageStatCard :icon="Send" label="Last published">
        <span class="text-[26px] font-semibold">{{ lastPublished ? shortDate(lastPublished.publishedAt!) : 'Never' }}</span>
        <template #detail><span class="line-clamp-1">{{ lastPublished?.title ?? 'Nothing published yet' }}</span></template>
      </PageStatCard>
    </PageGrid>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <HelpArticleList :articles="articles" :categories="categories" />
      <PageSection :icon="Folder" title="Categories" description="How articles are grouped on the help site." :count="categories.length" :row-height="56">
        <template v-if="canPublish" #action><button type="button" class="underline-offset-4 hover:underline" @click="managing = true">Manage</button></template>
        <PageRow v-for="c in categories" :key="c.id" :title="c.name" :detail="`${c.articleCount} ${c.articleCount === 1 ? 'article' : 'articles'}`" />
        <template #empty>No categories yet.</template>
      </PageSection>
    </div>

    <Dialog v-if="canPublish" v-model:open="managing">
      <DialogContent class="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Categories</DialogTitle>
          <DialogDescription>Add, rename, reorder or remove the help site’s categories.</DialogDescription>
        </DialogHeader>
        <HelpCategoryManager :categories="categories" @changed="onCategoriesChanged" />
      </DialogContent>
    </Dialog>
  </PageBody>
</template>
