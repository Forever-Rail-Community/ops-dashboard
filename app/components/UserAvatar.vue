<script setup lang="ts">
// The signed-in person's Discord avatar, or their initials while it loads or if they have none.
const { user } = useUserSession()
const initials = computed(() => (user.value?.name ?? '?').slice(0, 2).toUpperCase())
</script>

<template>
  <Avatar>
    <AvatarImage v-if="user?.avatar" :src="user.avatar" :alt="user.name" />
    <AvatarFallback>{{ initials }}</AvatarFallback>
  </Avatar>
</template>
