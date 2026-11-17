<script setup lang="ts">
// Help center categories: add, edit, reorder, and delete (only when empty). Needs "help.publish".
import { ArrowDown, ArrowUp, Pencil, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const props = defineProps<{ categories: HelpCategory[] }>()
const emit = defineEmits<{ changed: [] }>()

const blank = (): HelpCategoryInput => ({ slug: '', name: '', description: '', icon: 'book-open' })
const form = reactive<HelpCategoryInput>(blank())
const editingId = ref<number | null>(null)
const slugTouched = ref(false)
const busy = ref(false)

// The URL follows the name until someone edits it by hand.
watch(() => form.name, (name) => {
  if (!slugTouched.value) form.slug = helpSlugFromTitle(name)
})

function edit(c: HelpCategory) {
  editingId.value = c.id
  slugTouched.value = true
  Object.assign(form, { slug: c.slug, name: c.name, description: c.description, icon: c.icon })
}

function reset() {
  editingId.value = null
  slugTouched.value = false
  Object.assign(form, blank())
}

async function run(request: () => Promise<unknown>, success: string) {
  busy.value = true
  try {
    await request()
    toast.success(success)
    emit('changed')
    return true
  } catch (err: any) {
    toast.error('That did not work', { description: err?.data?.statusMessage ?? 'Try again.' })
    return false
  } finally {
    busy.value = false
  }
}

async function save() {
  const id = editingId.value
  const body = { ...form }
  const done = id
    ? await run(() => $fetch(`/api/help/categories/${id}`, { method: 'PUT', body }), 'Category saved')
    : await run(() => $fetch('/api/help/categories', { method: 'POST', body }), 'Category added')
  if (done) reset()
}

// Moves a category one place up or down, then numbers every category by its new position
// (saving only the ones whose number changes), so gaps or ties in the old numbers can't misplace anything.
async function move(index: number, by: -1 | 1) {
  const order = [...props.categories]
  ;[order[index], order[index + by]] = [order[index + by]!, order[index]!]
  const changed = order.flatMap((c, sortOrder) => (c.sortOrder === sortOrder ? [] : [{ ...c, sortOrder }]))
  const put = ({ id, slug, name, description, icon, sortOrder }: HelpCategory) =>
    $fetch(`/api/help/categories/${id}`, { method: 'PUT', body: { slug, name, description, icon, sortOrder } })
  await run(() => Promise.all(changed.map(put)), 'Order saved')
}

function remove(c: HelpCategory) {
  if (!confirm(`Delete the category "${c.name}"?`)) return
  run(() => $fetch(`/api/help/categories/${c.id}`, { method: 'DELETE' }), 'Category deleted')
}
</script>

<template>
  <div class="grid gap-6">
    <Card>
      <CardHeader>
        <CardTitle>{{ editingId ? 'Edit category' : 'Add a category' }}</CardTitle>
        <CardDescription>Categories group articles on the help site, like "Getting started" or "Railroader".</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
          <div class="grid gap-2">
            <Label for="cat-name">Name</Label>
            <Input id="cat-name" v-model="form.name" :maxlength="HELP_LIMITS.categoryName" required />
          </div>
          <div class="grid gap-2">
            <Label for="cat-slug">Web address</Label>
            <Input id="cat-slug" v-model="form.slug" :maxlength="HELP_LIMITS.slug" required @input="slugTouched = true" />
            <p class="text-xs text-muted-foreground">Lowercase words joined by dashes. Changing it later breaks old links.</p>
          </div>
          <div class="grid gap-2 sm:col-span-2">
            <Label for="cat-description">Description</Label>
            <Input id="cat-description" v-model="form.description" :maxlength="HELP_LIMITS.categoryDescription" placeholder="One line about what's in this category" />
          </div>
          <div class="grid gap-2">
            <Label for="cat-icon">Icon</Label>
            <Input id="cat-icon" v-model="form.icon" placeholder="book-open" />
            <p class="text-xs text-muted-foreground">
              A name from <a href="https://lucide.dev/icons" target="_blank" rel="noopener" class="underline">lucide.dev/icons</a>, like train-front.
            </p>
          </div>
          <div class="flex items-end gap-2 sm:col-span-2">
            <Button type="submit" :disabled="busy">{{ editingId ? 'Save category' : 'Add category' }}</Button>
            <Button v-if="editingId" type="button" variant="ghost" @click="reset">Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Shown on the help site in this order. A category can only be deleted once it has no articles.</CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="!categories.length" class="text-sm text-muted-foreground">No categories yet. Add one above.</p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Web address</TableHead>
              <TableHead>Articles</TableHead>
              <TableHead class="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(c, i) in categories" :key="c.id">
              <TableCell>
                <div class="font-medium">{{ c.name }}</div>
                <div v-if="c.description" class="text-xs text-muted-foreground">{{ c.description }}</div>
              </TableCell>
              <TableCell class="font-mono text-xs">/{{ c.slug }}</TableCell>
              <TableCell>{{ c.articleCount }}</TableCell>
              <TableCell>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon" class="size-8" :aria-label="`Move ${c.name} up`" :disabled="busy || i === 0" @click="move(i, -1)"><ArrowUp /></Button>
                  <Button variant="ghost" size="icon" class="size-8" :aria-label="`Move ${c.name} down`" :disabled="busy || i === categories.length - 1" @click="move(i, 1)"><ArrowDown /></Button>
                  <Button variant="ghost" size="icon" class="size-8" :aria-label="`Edit ${c.name}`" :disabled="busy" @click="edit(c)"><Pencil /></Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="size-8 text-destructive hover:text-destructive"
                    :aria-label="`Delete ${c.name}`"
                    :title="c.articleCount ? 'Move or delete its articles first' : 'Delete'"
                    :disabled="busy || c.articleCount > 0"
                    @click="remove(c)"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
