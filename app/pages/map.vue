<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'

const { data, error } = useFetch<MapData>(`/api/map?v=${MAP_DATA_VERSION}`, { server: false, lazy: true })
const forbidden = computed(() => error.value?.statusCode === 403)
</script>

<template>
  <Alert v-if="forbidden">
    <CircleAlert />
    <AlertTitle>Your role can't view the map</AlertTitle>
    <AlertDescription>Ask an admin to give your role the "View the Railroader map" permission.</AlertDescription>
  </Alert>

  <Alert v-else-if="error" variant="destructive">
    <CircleAlert />
    <AlertTitle>Can't load the map</AlertTitle>
    <AlertDescription>Refresh the page. If it keeps happening, tell an admin.</AlertDescription>
  </Alert>

  <MapViewer v-else-if="data" :map="data" />

  <div v-else class="grid gap-4 lg:grid-cols-[1fr_300px]">
    <Skeleton class="h-[62vh] min-h-[420px] rounded-xl" />
    <Skeleton class="h-64 rounded-xl" />
  </div>
</template>
