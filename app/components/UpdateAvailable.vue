<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

// A notice floating at the top of every page once a new release of the Operations Center is out (its version, from
// package.json, which Release Please bumps), with a button to refresh into it. Asked every CHECK_MIN minutes and when
// the page comes back into view. Deploys that aren't a release don't change the version, so they don't show it.
const CHECK_MIN = 5
const { appVersion } = useRuntimeConfig().public
const live = ref<string>()

async function check() {
  try {
    live.value = (await $fetch<{ version: string }>('/api/public/version')).version
  } catch { /* offline or deploying: ask again next time */ }
}
useIntervalFn(check, CHECK_MIN * 60_000)
const visibility = useDocumentVisibility()
watch(visibility, (v) => v === 'visible' && check())

const due = computed(() => !!live.value && live.value !== appVersion)
const refresh = () => location.reload()
</script>

<template>
  <div
    v-if="due" role="status"
    class="fixed top-3 left-1/2 z-50 flex w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border bg-popover px-4 py-2 text-sm text-popover-foreground shadow-lg"
  >
    <span>A new version of the Operations Center is out: <b class="tabular-nums">v{{ live }}</b>. You're on v{{ appVersion }}.</span>
    <Button size="sm" class="h-7" @click="refresh"><RefreshCw />Refresh for update</Button>
  </div>
</template>
