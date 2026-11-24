<script setup lang="ts">
import { Signpost } from '@lucide/vue'

// One of your reports, opened from the list: what you sent, your screenshots, and staff's answer.
defineProps<{ report: BugReport | null }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Sheet :open="Boolean(report)" @update:open="(v) => !v && emit('close')">
    <SheetContent class="w-full gap-0 overflow-y-auto sm:max-w-[520px]">
      <template v-if="report">
        <SheetHeader class="gap-3 px-7 pt-7 pb-2">
          <div class="flex flex-wrap items-center gap-2.5 pr-8 text-xs text-muted-foreground">
            <BugsStatusTag :status="report.status" />#{{ report.id }}, {{ report.area }}, {{ shortDate(report.createdAt) }}
          </div>
          <SheetTitle class="text-2xl leading-tight font-semibold">{{ report.title }}</SheetTitle>
          <SheetDescription class="text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{{ report.body }}</SheetDescription>
        </SheetHeader>
        <div class="flex flex-col gap-5 px-7 pt-4 pb-7">
          <BugsScreenshots :ids="report.screenshots" size="large" />
          <div class="rounded-xl border bg-background px-4 py-3.5 text-sm">
            <div class="mb-1 font-semibold">Staff</div>
            <p v-if="report.reply" class="whitespace-pre-line">{{ report.reply }}</p>
            <p v-else class="text-muted-foreground">No reply yet. You’ll see it here, along with any change of status.</p>
          </div>
          <NuxtLink v-if="report.roadmapItem" to="/roadmap" class="flex items-center gap-2 text-sm underline-offset-4 hover:underline">
            <Signpost class="size-4" />On the roadmap as “{{ report.roadmapItem.title }}”
          </NuxtLink>
        </div>
      </template>
    </SheetContent>
  </Sheet>
</template>
