<script setup lang="ts">
import { BookOpen, Bug, Check, ChevronsUpDown, Gamepad2, Megaphone, Milestone, ShieldCheck } from '@lucide/vue'

const { user } = useUserSession()
const { site } = useSite()
const route = useRoute()
const { current, labelOf } = useGame()

const isAdmin = computed(() => user.value?.permissions?.some((p) => p.startsWith('admin.')) ?? false)
const canEditHelp = computed(() => user.value?.permissions?.includes('help.edit') ?? false)
const canPostUpdates = computed(() => user.value?.permissions?.includes('updates.post') ?? false)
const features = computed(() => (current.value ? visibleFeatures(current.value, user.value?.permissions) : []))
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

      <SidebarGroup>
        <SidebarGroupLabel>Community</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="route.path.startsWith('/roadmap')" tooltip="Roadmap">
                <NuxtLink to="/roadmap">
                  <Milestone />
                  <span>Roadmap</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :is-active="route.path.startsWith('/bugs')" tooltip="Bug reports">
                <NuxtLink to="/bugs">
                  <Bug />
                  <span>Bug reports</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup v-if="isAdmin || canEditHelp || canPostUpdates">
        <SidebarGroupLabel>Manage</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-if="canEditHelp">
              <SidebarMenuButton as-child :is-active="route.path.startsWith('/help')" tooltip="Help center">
                <NuxtLink to="/help">
                  <BookOpen />
                  <span>Help center</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem v-if="canPostUpdates">
              <SidebarMenuButton as-child :is-active="route.path.startsWith('/updates')" tooltip="What's new">
                <NuxtLink to="/updates">
                  <Megaphone />
                  <span>What's new</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem v-if="isAdmin">
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
                <UserAvatar class="size-8 rounded-lg" />
                <div class="grid flex-1 text-left text-sm leading-tight">
                  <span class="truncate font-medium">{{ user?.name }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ user?.roles?.join(', ') }}</span>
                </div>
                <ChevronsUpDown class="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="w-56" side="top" align="start">
              <UserMenuItems />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>
