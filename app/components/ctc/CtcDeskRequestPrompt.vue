<script setup lang="ts">
// What the dispatcher on a desk sees when someone requests it (FOR-17), on whatever page of the site they have open:
// Approve or Decline, with the time left to respond. No response declines. A staff takeover can't be declined: it says
// who is taking over and when, and Clock out now hands the desk over at once. It can't be closed without answering, so
// it's always seen; the page tells the server once it's shown, and a takeover waits for that.
import { useIntervalFn } from '@vueuse/core'

const props = defineProps<{ request: CtcDeskRequest; busy?: boolean }>()
const emit = defineEmits<{ give: []; keep: [] }>()

const now = ref(Date.now())
useIntervalFn(() => (now.value = Date.now()), 1000)
const left = computed(() => Math.min(DESK_REQUEST_SEC, Math.max(0, Math.ceil((Date.parse(props.request.until) - now.value) / 1000))))
const countdown = computed(() => `${Math.floor(left.value / 60)}:${String(left.value % 60).padStart(2, '0')}`)
const from = computed(() => props.request.from.name)
const deskName = computed(() => props.request.deskName)

onMounted(() => { if (props.request.sound) chime() })
</script>

<template>
  <Dialog :open="true">
    <DialogContent class="sm:max-w-md" :show-close-button="false" @escape-key-down.prevent @pointer-down-outside.prevent @interact-outside.prevent>
      <DialogHeader>
        <DialogTitle v-if="request.takeover">Staff takeover: {{ deskName }}</DialogTitle>
        <DialogTitle v-else>Transfer request: {{ deskName }}</DialogTitle>
        <DialogDescription v-if="request.takeover">
          {{ from }} (staff) is taking over {{ deskName }}. You will be clocked out in {{ countdown }}. Complete any
          command in progress before then.
        </DialogDescription>
        <DialogDescription v-else>
          {{ from }} has requested {{ deskName }}. Approve to transfer the desk and clock out. If you do not respond
          within {{ countdown }}, the request is declined and you remain on duty.
        </DialogDescription>
      </DialogHeader>
      <div class="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div class="h-full bg-primary transition-[width] duration-1000 ease-linear" :style="{ width: `${(left / DESK_REQUEST_SEC) * 100}%` }" />
      </div>
      <DialogFooter>
        <template v-if="request.takeover">
          <Button :disabled="busy" @click="emit('give')">Clock out now</Button>
        </template>
        <template v-else>
          <Button variant="outline" :disabled="busy" @click="emit('keep')">Decline</Button>
          <Button :disabled="busy" @click="emit('give')">Approve transfer</Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
