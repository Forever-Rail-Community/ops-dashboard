<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'

// The railroad's multiplayer join code, from the server's Signals mod. null: the railroad isn't open to multiplayer.
defineProps<{ code: string | null }>()
const { copied, copyText } = useCopyText()
</script>

<template>
  <StatusDetail label="Join code">
    <span v-if="code" class="flex items-center gap-1">
      <span class="font-mono font-semibold tracking-[.12em] select-all">{{ code }}</span>
      <Button variant="ghost" size="icon" class="size-6" :aria-label="copied ? 'Copied' : 'Copy join code'" @click="copyText(code!)">
        <Check v-if="copied" class="size-3.5" />
        <Copy v-else class="size-3.5" />
      </Button>
    </span>
    <template v-else>Not open to multiplayer</template>
  </StatusDetail>
</template>
