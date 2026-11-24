<script setup lang="ts">
// What's planned, up next, being built and shipped. Full width, without the sidebar (layouts/community.vue).
definePageMeta({ title: 'Roadmap', layout: 'community' })

// The requests used to be a tab here.
const route = useRoute()
if (route.query.tab === 'requests') await navigateTo('/roadmap/requests', { replace: true })

const { staff, items, refreshAll } = useRoadmap()
await items
</script>

<template>
  <PageHeader title="Roadmap" description="What’s planned, up next, being built and shipped. Vote for the ones you want." />
  <RoadmapBoard :items="items.data.value" :staff="staff" @changed="refreshAll" />
</template>
