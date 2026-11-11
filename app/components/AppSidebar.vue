<script setup lang="ts">
import { ChevronsUpDown, LogOut, Map as MapIcon, ShieldCheck, TrainFront } from '@lucide/vue'

const { user, clear } = useUserSession()
const { site, t } = useSite()
const route = useRoute()

const isAdmin = computed(() => user.value?.permissions?.some((p) => p.startsWith('admin.')) ?? false)
const canSeeMap = computed(() => user.value?.permissions?.includes('map.view') ?? false)
const initials = computed(() => (user.value?.name ?? '?').slice(0, 2).toUpperCase())

async function signOut() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <Sidebar variant="inset" collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <NuxtLink to="/">
              <div class="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-sidebar-accent">
                <img :src="site.logo" :alt="`${site.name} logo`" class="size-full object-contain" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ site.name }}</span>
                <span v-if="site.subtitle" class="truncate text-xs text-muted-foreground">{{ site.subtitle }}</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Operations</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="route.path === '/'" :tooltip="t('pageTitle')">
                <NuxtLink to="/">
                  <TrainFront />
                  <span>{{ t('pageTitle') }}</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem v-if="canSeeMap">
              <SidebarMenuButton as-child :is-active="route.path === '/map'" tooltip="Map">
                <NuxtLink to="/map">
                  <MapIcon />
                  <span>Map</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup v-if="isAdmin">
        <SidebarGroupLabel>Manage</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="route.path.startsWith('/admin')" tooltip="Admin">
                <NuxtLink to="/admin">
                  <ShieldCheck />
                  <span>Admin</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <SidebarMenuButton size="lg" class="data-[state=open]:bg-sidebar-accent">
                <Avatar class="size-8 rounded-lg">
                  <AvatarImage v-if="user?.avatar" :src="user.avatar" :alt="user.name" />
                  <AvatarFallback class="rounded-lg">{{ initials }}</AvatarFallback>
                </Avatar>
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">{{ user?.name }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ user?.roles?.join(', ') }}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" side="top" align="start">
              <DropdownMenuItem @select="signOut">
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
