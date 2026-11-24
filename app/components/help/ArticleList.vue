<script setup lang="ts">
// Every article, newest edits first, with search and filters.
import { FileText, Search, Star } from '@lucide/vue'
import { NuxtLink } from '#components'

const props = defineProps<{ articles: HelpArticleSummary[]; categories: HelpCategory[] }>()

const ALL = 'all'
const query = ref('')
const categoryFilter = ref<string>(ALL)
const statusFilter = ref<string>(ALL)

const STATUS_OPTIONS: { value: HelpStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'changed', label: 'Changes not published' },
  { value: 'published', label: 'Published' }
]

const categoryName = computed(() => new Map(props.categories.map((c) => [c.id, c.name])))

const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.articles
    .filter((a) => categoryFilter.value === ALL || String(a.categoryId) === categoryFilter.value)
    .filter((a) => statusFilter.value === ALL || a.status === statusFilter.value)
    .filter((a) => !q || a.title.toLowerCase().includes(q) || a.slug.includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

const updated = (iso: string) => formatAge(Math.round((Date.now() - Date.parse(iso)) / 1000))
</script>

<template>
  <PageSection :icon="FileText" title="Articles" description="Everything on the public help site, newest changes first." :count="shown.length" :row-height="60">
    <template #action><slot name="action" /></template>
    <div class="flex flex-wrap gap-2 pt-1 pb-3">
      <div class="relative min-w-52 flex-1">
        <Search class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input v-model="query" placeholder="Search articles" class="pl-8" aria-label="Search articles" />
      </div>
      <Select v-model="categoryFilter">
        <SelectTrigger class="w-44" aria-label="Category"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">All categories</SelectItem>
          <SelectItem v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="statusFilter">
        <SelectTrigger class="w-48" aria-label="Status"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Any status</SelectItem>
          <SelectItem v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <PageRow
      v-for="a in shown" :key="a.id" :as="NuxtLink" :to="`/help/${a.id}`" class="hover:bg-accent/40"
      :detail="`${categoryName.get(a.categoryId)}${a.section ? `, ${a.section}` : ''}, ${helpGameName(a.game)}, edited ${updated(a.updatedAt)} by ${a.updatedByName}`"
    >
      <template #title>{{ a.title }}<Star v-if="a.featuredAt" class="ml-1.5 inline size-3.5 fill-current align-[-2px] text-amber-500" aria-label="Featured" /></template>
      <template #trailing><HelpStatusBadge :status="a.status" /></template>
    </PageRow>
    <template #empty>{{ articles.length ? 'No articles match.' : 'No articles yet. Press "New article" to write the first one.' }}</template>
  </PageSection>
</template>
