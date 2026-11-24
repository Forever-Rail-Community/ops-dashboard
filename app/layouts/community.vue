<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'

// The Roadmap and Feature requests: full width, with their own tabs and filters instead of the sidebar.
const { site } = useSite()
const whatsNew = useWhatsNew()
const route = useRoute()
const tabs = [
  { to: '/roadmap', label: 'Roadmap' },
  { to: '/roadmap/requests', label: 'Feature requests' }
]
const tab = 'flex h-16 items-center border-b-2 px-0.5 text-sm font-medium'
</script>

<template>
  <div class="min-h-svh bg-background">
    <header class="z-20 border-b bg-background/85 backdrop-blur md:sticky md:top-0">
      <div class="mx-auto flex min-h-16 max-w-[1360px] flex-wrap items-center gap-x-7 gap-y-2 px-4 md:px-6">
        <NuxtLink to="/" class="flex items-center gap-2.5">
          <span class="grid size-8 place-items-center overflow-hidden rounded-lg bg-muted"><img :src="site.logo" alt="" class="size-full object-contain" /></span>
          <span class="leading-tight">
            <span class="block text-sm font-semibold">{{ site.name }}</span>
            <span v-if="site.subtitle" class="block text-xs text-muted-foreground">{{ site.subtitle }}</span>
          </span>
        </NuxtLink>
        <nav aria-label="Community" class="flex gap-6">
          <NuxtLink
            v-for="t in tabs" :key="t.to" :to="t.to" :class="[tab, route.path === t.to ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground']"
            :aria-current="route.path === t.to ? 'page' : undefined"
          >{{ t.label }}</NuxtLink>
          <button type="button" :class="[tab, 'border-transparent text-muted-foreground hover:text-foreground']" @click="whatsNew.open.value = true">What’s new</button>
        </nav>
        <div class="ml-auto flex items-center gap-1">
          <Button variant="outline" as-child class="mr-1"><NuxtLink to="/"><ChevronLeft />Dashboard</NuxtLink></Button>
          <StatusWidget />
          <ThemeToggle />
        </div>
      </div>
      <div class="border-t">
        <div class="mx-auto max-w-[1360px] px-4 py-2.5 md:px-6"><RoadmapFilterBar :search-label="route.path === '/roadmap' ? 'Search the roadmap' : 'Search ideas'" /></div>
      </div>
    </header>
    <main class="mx-auto flex max-w-[1360px] flex-col gap-6 px-4 pt-8 pb-12 md:px-6">
      <NoticeBanner />
      <slot />
    </main>
    <UpdatesWhatsNewDialog />
  </div>
</template>
