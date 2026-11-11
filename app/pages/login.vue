<script setup lang="ts">
definePageMeta({ layout: 'auth' })

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
  <Card>
    <CardHeader class="items-center text-center">
      <img :src="site.logo" :alt="`${site.name} logo`" class="mb-2 size-14 rounded-xl object-contain" />
      <CardTitle class="text-xl">{{ site.name }} {{ site.subtitle }}</CardTitle>
      <CardDescription>Sign in with the Discord account you use in the community.</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <Alert v-if="error" variant="destructive">
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>
      <Button as-child size="lg" class="w-full">
        <a href="/auth/discord">Continue with Discord</a>
      </Button>
    </CardContent>
  </Card>
</template>
