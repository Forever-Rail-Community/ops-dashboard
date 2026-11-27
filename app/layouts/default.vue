<script setup lang="ts">
const route = useRoute()
const { current, feature, labelOf } = useGame()

// A game's pages are named by their entry in GAMES (the same name the sidebar shows);
// other pages name themselves with definePageMeta({ title }).
const title = computed(() =>
  feature.value ? `${current.value!.name} · ${labelOf(feature.value)}` : String(route.meta.title ?? '')
)
</script>

<template>
  <SidebarProvider :default-open="true">
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
        <h1 class="text-sm font-medium">{{ title }}</h1>
        <div class="ml-auto flex items-center gap-2">
          <StatusWidget />
          <UpdatesWhatsNewButton />
          <ThemeToggle />
          <UserMenu />
        </div>
        <UpdatesWhatsNewDialog />
      </header>
      <main class="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <NoticeBanner />
        <slot />
      </main>
      <AppFooter class="px-4 pb-4 md:px-6" />
    </SidebarInset>
  </SidebarProvider>
</template>
