<script setup lang="ts">
// The avatar at the right of the top bar, opening the account menu. The place for a profile and preferences later.
const { user } = useUserSession()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button type="button" :class="[HEADER_CONTROL, 'w-10 rounded-full p-0']" :aria-label="`Account: ${user?.name ?? 'you'}`">
        <UserAvatar class="size-[38px]" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent class="w-56" align="end" :side-offset="6">
      <UserMenuItems />
    </DropdownMenuContent>
  </DropdownMenu>
</template>
