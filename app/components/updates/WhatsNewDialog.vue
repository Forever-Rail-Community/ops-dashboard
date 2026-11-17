<script setup lang="ts">
// "What's new": opens by itself the first time someone signs in after an update is published, unless they've
// turned that off. The newest update in full, then a few earlier ones.
const { open, updates, ready, unseen, autoShow, load, close, setAutoShow } = useWhatsNew()

onMounted(load)
// Decide once, when both the updates and the person's choices are in.
const stop = watch(
  [ready, updates],
  () => {
    if (!ready.value || !updates.value) return
    if (autoShow.value && unseen.value) open.value = true
    stop()
  },
  { flush: 'post' }
)

const latest = computed(() => updates.value?.[0])
const earlier = computed(() => updates.value?.slice(1, 6) ?? [])
const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ''
</script>

<template>
  <Dialog :open="open && Boolean(latest)" @update:open="(v) => !v && close()">
    <DialogContent v-if="latest" class="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-md">
      <DialogHeader>
        <DialogTitle>What's new</DialogTitle>
        <DialogDescription>{{ formatDate(latest.publishedAt) }}</DialogDescription>
      </DialogHeader>
      <div class="grid content-start gap-5 overflow-y-auto pr-1">
        <section class="grid gap-2">
          <h3 class="font-medium">{{ latest.title }}</h3>
          <UpdatesUpdateChanges :changes="latest.changes" />
        </section>
        <section v-if="earlier.length" class="grid gap-3 border-t pt-4">
          <h3 class="text-sm font-medium text-muted-foreground">Earlier updates</h3>
          <div v-for="u in earlier" :key="u.id" class="grid gap-1">
            <p class="text-sm font-medium">{{ u.title }} <span class="font-normal text-muted-foreground">· {{ formatDate(u.publishedAt) }}</span></p>
            <ul class="list-disc pl-5 text-sm text-muted-foreground">
              <li v-for="(c, i) in u.changes" :key="i">{{ c.text }}</li>
            </ul>
          </div>
        </section>
      </div>
      <DialogFooter class="items-center gap-3 border-t pt-4 sm:justify-between">
        <label class="flex items-center gap-2 text-sm">
          <Checkbox :model-value="autoShow" @update:model-value="(v) => setAutoShow(v === true)" />
          Show this when there's an update
        </label>
        <Button size="sm" @click="close">Got it</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
