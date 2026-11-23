<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { toast } from 'vue-sonner'

// The railroad's multiplayer join code, from the server's Signals mod. null: the railroad isn't open to multiplayer.
const props = defineProps<{ code: string | null }>()
const copied = ref(false)

async function copy() {
  if (!props.code) return
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('Not copied', { description: 'Your browser blocked it. Select the code and copy it yourself.' })
  }
}
</script>

<template>
  <div>
    <div class="text-muted-foreground">Join code</div>
    <div v-if="code" class="flex items-center gap-1">
      <span class="font-mono text-base font-semibold tracking-widest select-all">{{ code }}</span>
      <Button variant="ghost" size="icon" class="size-7" :aria-label="copied ? 'Copied' : 'Copy join code'" @click="copy">
        <Check v-if="copied" class="size-4" />
        <Copy v-else class="size-4" />
      </Button>
    </div>
    <div v-else class="font-medium">Not open to multiplayer</div>
    <div v-if="code" class="text-muted-foreground">Enter it in Join Multiplayer in Railroader.</div>
  </div>
</template>
