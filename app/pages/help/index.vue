<script setup lang="ts">
import { Plus } from '@lucide/vue'

definePageMeta({ title: 'Help center' })

const { user } = useUserSession()
const canPublish = computed(() => user.value?.permissions?.includes('help.publish') ?? false)

const [{ data: articles, refresh: refreshArticles }, { data: categories, refresh: refreshCategories }] = await Promise.all([
  useFetch<HelpArticleSummary[]>('/api/help/articles', { key: 'help-articles', default: () => [] }),
  useFetch<HelpCategory[]>('/api/help/categories', { key: 'help-categories', default: () => [] })
])

const counts = computed(() => ({
  drafts: articles.value.filter((a) => a.status !== 'published').length,
  published: articles.value.filter((a) => a.status !== 'draft').length
}))

async function onCategoriesChanged() {
  await Promise.all([refreshCategories(), refreshArticles()])
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Help center</h2>
        <p class="text-sm text-muted-foreground">
          Articles for the public help site. {{ counts.published }} published, {{ counts.drafts }} with drafts in progress.
        </p>
      </div>
      <Button v-if="categories.length" as-child>
        <NuxtLink to="/help/new"><Plus /> New article</NuxtLink>
      </Button>
    </div>

    <Alert v-if="!categories.length">
      <AlertTitle>Add a category first</AlertTitle>
      <AlertDescription>
        Every article belongs to a category.
        {{ canPublish ? 'Add one on the Categories tab.' : 'Ask someone who can publish help articles to add one.' }}
      </AlertDescription>
    </Alert>

    <Tabs default-value="articles">
      <TabsList>
        <TabsTrigger value="articles">Articles</TabsTrigger>
        <TabsTrigger v-if="canPublish" value="categories">Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="articles" class="pt-4">
        <HelpArticleList :articles="articles" :categories="categories" />
      </TabsContent>
      <TabsContent v-if="canPublish" value="categories" class="pt-4">
        <HelpCategoryManager :categories="categories" @changed="onCategoriesChanged" />
      </TabsContent>
    </Tabs>
  </div>
</template>
