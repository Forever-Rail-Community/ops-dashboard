<script setup lang="ts">
import { Check, ChevronsUpDown, Gamepad2, LogOut, ShieldCheck } from '@lucide/vue'

const { user, clear } = useUserSession()
const { site } = useSite()
const route = useRoute()
const { current, labelOf } = useGame()

const isAdmin = computed(() => user.value?.permissions?.some((p) => p.startsWith('admin.')) ?? false)
const features = computed(() => (current.value ? visibleFeatures(current.value, user.value?.permissions) : []))
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
      <!-- Which game you're operating. Picking one opens its section, which also remembers the choice. -->
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <SidebarMenuButton class="border data-[state=open]:bg-sidebar-accent" tooltip="Change game">
                  <Gamepad2 />
                  <span class="truncate font-medium">{{ current?.name ?? 'Choose a game' }}</span>
                  <ChevronsUpDown class="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent class="w-56" align="start">
                <DropdownMenuItem v-for="game in GAMES" :key="game.key" as-child>
                  <NuxtLink :to="`/${game.key}`">
                    {{ game.name }}
                    <Check v-if="current?.key === game.key" class="ml-auto" />
                  </NuxtLink>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <SidebarGroup v-if="current && features.length">
        <SidebarGroupLabel>{{ current.name }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="feature in features" :key="feature.to">
              <SidebarMenuButton as-child :is-active="route.path === feature.to" :tooltip="labelOf(feature)">
                <NuxtLink :to="feature.to">
                  <component :is="feature.icon" />
                  <span>{{ labelOf(feature) }}</span>
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
