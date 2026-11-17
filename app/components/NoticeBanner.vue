<script setup lang="ts">
import { Construction, X } from '@lucide/vue'

// A notice at the top of the sign-in page and of every dashboard page, e.g. that the site is still being built.
// Admins set the text in Admin > Appearance; empty hides it. Closing it lasts until the text changes. It's kept in a
// cookie, so the server leaves it out of the page too, and it doesn't flash on load.
const { site } = useSite()
const { loggedIn } = useUserSession()
const closed = useCookie<string | null>('fr-notice-closed', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })

const text = computed(() => site.value.notice.trim())
const shown = computed(() => text.value && closed.value !== text.value)
</script>

<template>
  <Alert v-if="shown" role="status" class="pr-11">
    <Construction class="text-amber-600 dark:text-amber-400" />
    <AlertDescription class="text-foreground">
      <p>
        {{ text }}
        <NuxtLink v-if="loggedIn" to="/bugs" class="font-medium whitespace-nowrap underline underline-offset-2">Report a bug</NuxtLink>
      </p>
    </AlertDescription>
    <Button variant="ghost" size="icon" class="absolute top-1.5 right-1.5 size-7 text-muted-foreground" aria-label="Close this notice" @click="closed = text">
      <X />
    </Button>
  </Alert>
</template>
