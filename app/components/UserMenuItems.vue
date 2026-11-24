<script setup lang="ts">
import { LogOut } from '@lucide/vue'

// What's in the account menu, wherever it opens from (the avatar in the top bar, or the sidebar's footer): who's
// signed in, their unit preference, and signing out.
const { user, clear } = useUserSession()
const { prefs, update } = usePreferences()
const setUnits = (value: unknown) => {
  if (isUnitSystem(value)) update({ units: value })
}
async function signOut() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <DropdownMenuLabel class="grid font-normal">
    <span class="truncate text-sm font-medium">{{ user?.name }}</span>
    <span class="truncate text-xs text-muted-foreground">{{ user?.roles?.join(', ') }}</span>
  </DropdownMenuLabel>
  <DropdownMenuSeparator />
  <DropdownMenuLabel class="text-xs font-normal text-muted-foreground">Units</DropdownMenuLabel>
  <DropdownMenuRadioGroup :model-value="prefs.units" @update:model-value="setUnits">
    <DropdownMenuRadioItem v-for="u in UNIT_SYSTEMS" :key="u.value" :value="u.value" @select.prevent>{{ u.label }}</DropdownMenuRadioItem>
  </DropdownMenuRadioGroup>
  <DropdownMenuSeparator />
  <DropdownMenuItem @select="signOut">
    <LogOut />
    Sign out
  </DropdownMenuItem>
</template>
