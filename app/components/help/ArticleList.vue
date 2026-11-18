<script setup lang="ts">
// Every article, newest edits first, with search and filters.
import { Search, Star } from '@lucide/vue'

const props = defineProps<{ articles: HelpArticleSummary[]; categories: HelpCategory[] }>()

const ALL = 'all'
const query = ref('')
const categoryFilter = ref<string>(ALL)
const statusFilter = ref<string>(ALL)

const STATUS_OPTIONS: { value: HelpStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'changed', label: 'Unpublished changes' },
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
  <Card>
    <CardHeader class="gap-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="relative min-w-56 flex-1">
          <Search class="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input v-model="query" placeholder="Search articles" class="pl-8" aria-label="Search articles" />
        </div>
        <Select v-model="categoryFilter">
          <SelectTrigger class="w-48" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">All categories</SelectItem>
            <SelectItem v-for="c in categories" :key="c.id" :value="String(c.id)">{{ c.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="statusFilter">
          <SelectTrigger class="w-52" aria-label="Status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Any status</SelectItem>
            <SelectItem v-for="s in STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>
    <CardContent>
      <p v-if="!articles.length" class="text-sm text-muted-foreground">No articles yet. Press "New article" to write the first one.</p>
      <p v-else-if="!shown.length" class="text-sm text-muted-foreground">No articles match.</p>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Game</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last edit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="a in shown" :key="a.id">
            <TableCell class="font-medium">
              <NuxtLink :to="`/help/${a.id}`" class="hover:underline">{{ a.title }}</NuxtLink>
              <Star v-if="a.featuredAt" class="ml-1.5 inline size-3.5 fill-current align-[-2px] text-amber-500" aria-label="Featured" />
              <div v-if="a.section" class="text-xs font-normal text-muted-foreground">{{ a.section }}</div>
            </TableCell>
            <TableCell>{{ categoryName.get(a.categoryId) }}</TableCell>
            <TableCell>{{ helpGameName(a.game) }}</TableCell>
            <TableCell><HelpStatusBadge :status="a.status" /></TableCell>
            <TableCell class="text-muted-foreground">{{ updated(a.updatedAt) }} by {{ a.updatedByName }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
