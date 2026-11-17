<script setup lang="ts">
import { Construction, X } from '@lucide/vue'

// A notice across the top of the sign-in page and the dashboard, e.g. that the site is still being built. Admins
// set the text in Admin > Appearance; empty hides it. Closing it lasts until the text changes. It's kept in a
// cookie, so the server leaves it out of the page too, and it doesn't flash on load.
const { site } = useSite()
const { loggedIn } = useUserSession()
const closed = useCookie<string | null>('fr-notice-closed', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

const text = computed(() => site.value.notice.trim())
const shown = computed(() => text.value && closed.value !== text.value)
</script>

<template>
  <div v-if="shown" role="status" class="flex items-start gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
    <Construction class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
    <p class="min-w-0 flex-1">
      {{ text }}
      <NuxtLink v-if="loggedIn" to="/bugs" class="font-medium whitespace-nowrap underline underline-offset-2">Report a bug</NuxtLink>
    </p>
    <button type="button" class="-my-1 -mr-1 rounded p-1 hover:bg-amber-500/15" aria-label="Close this notice" @click="closed = text">
      <X class="size-4" />
    </button>
  </div>
</template>
