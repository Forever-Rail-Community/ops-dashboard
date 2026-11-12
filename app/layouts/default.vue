<script setup lang="ts">
const route = useRoute()
const { t } = useSite()

const TITLES: Record<string, string> = { '/map': 'Map' }
const title = computed(() =>
  route.path.startsWith('/admin') ? 'Admin' : TITLES[route.path] ?? t('pageTitle')
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
        <div class="ml-auto"><ThemeToggle /></div>
      </header>
      <main class="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
