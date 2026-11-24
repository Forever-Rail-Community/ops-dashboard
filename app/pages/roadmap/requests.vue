<script setup lang="ts">
import { ThumbsUp } from '@lucide/vue'

// Feature requests: members suggest and vote, staff answer. The form sits beside the list.
definePageMeta({ title: 'Feature requests', layout: 'community' })

const { staff, requests, refreshAll } = useRoadmap()
await requests
</script>

<template>
  <PageHeader title="Feature requests" description="Ideas from members. Vote for the ones you want, and staff move popular ones onto the roadmap." />
  <div class="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
    <RoadmapRequestList :requests="requests.data.value" :staff="staff" @changed="refreshAll" />
    <div class="grid gap-5">
      <RoadmapRequestForm id="suggest" :requests="requests.data.value" @posted="refreshAll" @vote="refreshAll" />
      <PageSection :icon="ThumbsUp" title="How voting works" description="Your votes, and what happens next.">
        <PageRow title="One vote per idea" detail="Vote for as many ideas as you like" />
        <PageRow title="Staff review new ideas" detail="Marked Planned or Declined, with a reason" />
        <PageRow title="Changes are posted in Discord" detail="When an idea moves on the roadmap" />
      </PageSection>
    </div>
  </div>
</template>
