<script setup lang="ts">
import { Check, Moon, Sun } from '@lucide/vue'

const { theme, set, init } = useTheme()
init()

const options = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
] as const
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" class="size-8" aria-label="Change theme">
        <Sun class="dark:hidden" />
        <Moon class="hidden dark:block" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem v-for="o in options" :key="o.value" @select="set(o.value)">
        {{ o.label }}
        <Check v-if="theme === o.value" class="ml-auto" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
