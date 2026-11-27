<script setup lang="ts">
// The foot of every page: the site's name and this release of the Operations Center (from package.json), with the
// commit Vercel built on hover. `bare` leaves out the name, for the sign-in page, which shows it already.
defineProps<{ bare?: boolean }>()
const { site } = useSite()
const { appVersion, appCommit } = useRuntimeConfig().public
</script>

<template>
  <footer class="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
    <span v-if="!bare">{{ site.name }}</span>
    <span class="ml-auto" :title="appCommit ? `Build ${appCommit}` : undefined">
      Operations Center <span class="font-medium text-foreground tabular-nums">v{{ appVersion }}</span>
    </span>
  </footer>
</template>
