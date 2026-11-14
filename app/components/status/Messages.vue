<script setup lang="ts">
// The messages a status page shows instead of data: no access, an error, still loading, or nothing reported yet.
import { CircleAlert } from '@lucide/vue'

defineProps<{ forbidden: boolean; error: boolean; loaded: boolean; empty: boolean; emptyTitle: string; emptyText: string }>()
</script>

<template>
  <Alert v-if="forbidden">
    <CircleAlert />
    <AlertTitle>Your role can't view this page</AlertTitle>
    <AlertDescription>Ask an admin to update your access.</AlertDescription>
  </Alert>
  <Alert v-else-if="error" variant="destructive">
    <CircleAlert />
    <AlertTitle>Can't load the status</AlertTitle>
    <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
  </Alert>
  <Skeleton v-else-if="!loaded" class="h-28 rounded-xl" />
  <Alert v-else-if="empty">
    <CircleAlert />
    <AlertTitle>{{ emptyTitle }}</AlertTitle>
    <AlertDescription>{{ emptyText }}</AlertDescription>
  </Alert>
</template>
