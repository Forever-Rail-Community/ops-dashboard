<script setup lang="ts">
import { Megaphone } from '@lucide/vue'

// In the top bar once someone has turned off What's new opening by itself; a dot marks an update they haven't seen.
const { open, updates, autoShow, unseen } = useWhatsNew()
</script>

<template>
  <button
    v-if="!autoShow && updates?.length"
    type="button"
    :class="[HEADER_CONTROL, 'relative w-10']"
    :aria-label="unseen ? 'What\'s new (new update)' : 'What\'s new'"
    @click="open = true"
  >
    <Megaphone class="size-[18px]" />
    <span v-if="unseen" class="absolute top-2 right-2 size-2 rounded-full bg-sky-500 ring-2 ring-background" aria-hidden="true" />
  </button>
</template>
