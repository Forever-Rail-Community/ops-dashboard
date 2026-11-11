<script setup lang="ts">
const route = useRoute()
const { site } = useSite()

const messages: Record<string, string> = {
  'not-member': "Your Discord account isn't in the Forever Rail server. Join the server, then sign in again.",
  'no-role': "Your account doesn't have a role that can use this dashboard. Ask an admin to give you one.",
  discord: "Discord sign-in didn't finish. Try again."
}

const error = computed(() => messages[String(route.query.error ?? '')])
</script>

<template>
  <div class="mx-auto mt-16 max-w-sm space-y-6 text-center">
    <img :src="site.logo" :alt="`${site.name} logo`" class="mx-auto size-20 rounded-xl object-contain" />
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ site.name }} {{ site.subtitle }}</h1>
      <p class="text-muted">Sign in with the Discord account you use in the community.</p>
    </div>

    <UAlert v-if="error" color="error" variant="subtle" :description="error" class="text-left" />

    <UButton
      to="/auth/discord"
      external
      icon="i-simple-icons-discord"
      label="Sign in with Discord"
      size="xl"
      block
    />
  </div>
</template>
