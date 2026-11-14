<script setup lang="ts">
// The game picker. Shown the first time; after that, "/" goes straight to the last game chosen (see the auth middleware).
definePageMeta({ title: 'Choose a game' })

const { user } = useUserSession()
</script>

<template>
  <div class="mx-auto grid w-full max-w-3xl gap-6 py-4 md:py-10">
    <div class="grid gap-1 text-center">
      <h2 class="text-2xl font-semibold tracking-tight">Which game are you operating today?</h2>
      <p class="text-muted-foreground">Each game has its own pages and data. You can switch any time from the sidebar.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <NuxtLink
        v-for="game in GAMES"
        :key="game.key"
        :to="`/${game.key}`"
        class="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card class="h-full transition-colors hover:border-primary">
          <CardHeader>
            <CardTitle class="text-xl">{{ game.name }}</CardTitle>
            <CardDescription>{{ game.description }}</CardDescription>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-1.5">
            <Badge v-for="feature in visibleFeatures(game, user?.permissions)" :key="feature.to" variant="secondary">
              {{ feature.label }}
            </Badge>
          </CardContent>
        </Card>
      </NuxtLink>
    </div>
  </div>
</template>
