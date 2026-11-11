<script setup lang="ts">
const { user, clear } = useUserSession()
const { site } = useSite()

const isAdmin = computed(() => user.value?.permissions?.some((p) => p.startsWith('admin.')) ?? false)

async function signOut() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-screen">
    <header class="border-b border-default">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <NuxtLink to="/" class="flex items-center gap-3">
          <img :src="site.logo" :alt="`${site.name} logo`" class="size-9 rounded-md object-contain" />
          <span class="leading-tight">
            <span class="block text-lg font-semibold">{{ site.name }}</span>
            <span v-if="site.subtitle" class="block text-xs text-muted">{{ site.subtitle }}</span>
          </span>
        </NuxtLink>

        <div v-if="user" class="flex items-center gap-3">
          <UButton v-if="isAdmin" to="/admin" label="Admin" color="neutral" variant="ghost" size="sm" />
          <UAvatar :src="user.avatar ?? undefined" :alt="user.name" size="sm" />
          <span class="hidden text-sm sm:inline">{{ user.name }}</span>
          <UButton label="Sign out" color="neutral" variant="ghost" size="sm" @click="signOut" />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
