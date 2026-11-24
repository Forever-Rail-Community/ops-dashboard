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
      <button type="button" :class="[HEADER_CONTROL, 'w-10']" aria-label="Change theme">
        <Sun class="size-[18px] dark:hidden" />
        <Moon class="hidden size-[18px] dark:block" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" :side-offset="6">
      <DropdownMenuItem v-for="o in options" :key="o.value" @select="set(o.value)">
        {{ o.label }}
        <Check v-if="theme === o.value" class="ml-auto" />
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
