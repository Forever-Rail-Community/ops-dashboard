<script setup lang="ts">
import { MessageSquare, ShieldCheck } from '@lucide/vue'

// A roadmap card: its area, title, two lines of description, who asked for it, and its votes. A bug fix shows how
// many people reported it instead, and no name, since bug reports are private.
const props = defineProps<{ item: RoadmapItem }>()
const emit = defineEmits<{ open: []; vote: [] }>()
const bugFix = computed(() => props.item.bugReports > 0)
</script>

<template>
  <article
    class="grid cursor-pointer gap-2 rounded-[14px] border bg-card px-4 py-3.5 text-left text-card-foreground transition-colors hover:border-foreground/20"
    tabindex="0" :aria-label="item.title" @click="emit('open')" @keydown.enter="emit('open')"
  >
    <div class="flex min-h-7 items-center gap-2">
      <RoadmapScopeTag :scope="item.scope" />
      <PagePill v-if="bugFix" tone="red">Bug fix</PagePill>
      <span v-if="bugFix" class="ml-auto text-xs whitespace-nowrap text-muted-foreground">{{ item.bugReports }} {{ item.bugReports === 1 ? 'report' : 'reports' }}</span>
      <RoadmapVoteButton
        v-else-if="item.requestId" class="ml-auto" :votes="item.votes" :voted="item.voted" :title="item.title"
        :disabled="item.status === 'complete'" @toggle="emit('vote')"
      />
    </div>
    <h3 class="text-[15px] leading-[21px] font-semibold">{{ item.title }}</h3>
    <p v-if="item.description" class="line-clamp-2 text-[13px] leading-[19px] text-muted-foreground">{{ item.description }}</p>
    <div class="flex items-center gap-2 pt-0.5 text-xs text-muted-foreground">
      <span v-if="bugFix" class="flex items-center gap-1.5"><ShieldCheck class="size-3.5" />Confirmed by staff</span>
      <RoadmapPerson v-else-if="item.requestedBy" :name="item.requestedBy" />
      <span v-else>From staff</span>
      <span class="ml-auto flex items-center gap-3 whitespace-nowrap">
        <span v-if="item.shippedIn">Shipped {{ shortDate(item.shippedIn.publishedAt) }}</span>
        <span v-if="item.comments" class="flex items-center gap-1" :aria-label="`${item.comments} comments`"><MessageSquare class="size-3.5" />{{ item.comments }}</span>
      </span>
    </div>
  </article>
</template>
