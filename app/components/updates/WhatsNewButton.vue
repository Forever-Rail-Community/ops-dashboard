<script setup lang="ts">
import { Megaphone } from '@lucide/vue'

// In the top bar once someone has turned off What's new opening by itself; a dot marks an update they haven't seen.
const { open, updates, autoShow, unseen } = useWhatsNew()
</script>

<template>
  <Button
    v-if="!autoShow && updates?.length"
    variant="ghost"
    size="icon"
    class="relative size-8"
    :aria-label="unseen ? 'What\'s new (new update)' : 'What\'s new'"
    @click="open = true"
  >
    <Megaphone />
    <span v-if="unseen" class="absolute top-1.5 right-1.5 size-2 rounded-full bg-sky-500 ring-2 ring-background" aria-hidden="true" />
  </Button>
</template>
