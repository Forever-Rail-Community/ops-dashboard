<script setup lang="ts">
import { RefreshCw } from '@lucide/vue'
import { useDocumentVisibility, useIntervalFn } from '@vueuse/core'

// A bar above every signed-in page once a new release of the Operations Center is out (its version, from package.json,
// which Release Please bumps), with a button that refreshes into it. Part of the page, so it pushes the page down
// rather than covering it. Asked every CHECK_MIN minutes and when the page comes back into view. Deploys that aren't a
// release don't change the version, so they don't show it. Not on the sign-in page: signing in loads the newest anyway.
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
    class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-primary px-4 py-2 text-sm text-primary-foreground"
  >
    <span>A new version of the Operations Center is out: <b class="tabular-nums">v{{ live }}</b>. You're on v{{ appVersion }}.</span>
    <Button size="sm" variant="secondary" class="h-7" @click="refresh"><RefreshCw />Click to update</Button>
  </div>
</template>
