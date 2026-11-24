<script setup lang="ts">
import { toast } from 'vue-sonner'
import { Trash2 } from '@lucide/vue'

// The comments on a roadmap item, oldest first, and a box to add one. You can delete your own; staff can delete any.
const props = defineProps<{ itemId: number; staff: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { data: comments, refresh } = useFetch<RoadmapComment[]>(() => `/api/roadmap/items/${props.itemId}/comments`, { default: () => [], server: false })
const text = ref('')
const busy = ref(false)

async function post() {
  busy.value = true
  try {
    await $fetch(`/api/roadmap/items/${props.itemId}/comments`, { method: 'POST', body: { body: text.value } })
    text.value = ''
    await refresh()
    emit('changed')
  } catch (err) {
    toast.error('Comment not posted', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}

async function remove(c: RoadmapComment) {
  try {
    await $fetch(`/api/roadmap/comments/${c.id}`, { method: 'DELETE' })
    await refresh()
    emit('changed')
  } catch (err) {
    toast.error('Not deleted', { description: errorText(err) })
  }
}
</script>

<template>
  <div class="grid gap-4">
    <h3 class="flex items-center gap-2 text-sm font-semibold">
      Comments
      <span class="inline-flex h-5 items-center rounded-full border bg-muted px-2 text-xs font-semibold tabular-nums">{{ comments.length }}</span>
    </h3>
    <p v-if="!comments.length" class="text-[13px] text-muted-foreground">No comments yet. Ask a question or say how you’d use it.</p>
    <div v-for="c in comments" :key="c.id" class="group flex gap-2.5">
      <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{{ c.author.slice(0, 1).toUpperCase() }}</span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 text-[13px]">
          <b class="font-semibold">{{ c.mine ? 'You' : c.author }}</b>
          <PagePill v-if="c.staff" tone="blue">Staff</PagePill>
          <span class="text-muted-foreground">{{ shortDate(c.createdAt) }}</span>
          <Button
            v-if="c.mine || staff" variant="ghost" size="icon" class="ml-auto size-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            :aria-label="`Delete ${c.mine ? 'your' : `${c.author}'s`} comment`" @click="remove(c)"
          ><Trash2 class="size-3.5" /></Button>
        </div>
        <p class="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground/85">{{ c.body }}</p>
      </div>
    </div>
    <form class="grid gap-2" @submit.prevent="post">
      <Textarea v-model="text" rows="3" :maxlength="ROADMAP_LIMITS.comment" placeholder="Add a comment" aria-label="Add a comment" />
      <Button type="submit" variant="outline" class="justify-self-end" :disabled="busy || !text.trim()">Comment</Button>
    </form>
  </div>
</template>
