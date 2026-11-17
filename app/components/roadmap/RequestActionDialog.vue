<script setup lang="ts">
import { toast } from 'vue-sonner'

// Staff answering a request: declining (with a reason), merging into another request, or replying.
export type DialogAction = 'decline' | 'merge' | 'reply'
const props = defineProps<{ request: FeatureRequest | null; action: DialogAction; requests: FeatureRequest[] }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ done: [] }>()

const textValue = ref('')
const into = ref<string>('')
const busy = ref(false)
watch(open, (on) => {
  if (!on) return
  textValue.value = props.action === 'reply' ? (props.request?.reply ?? '') : ''
  into.value = ''
})
const targets = computed(() => props.requests.filter((r) => r.id !== props.request?.id && r.status !== 'merged' && r.status !== 'declined'))

const COPY: Record<DialogAction, { title: string; label: string; button: string; done: string }> = {
  decline: { title: 'Decline', label: 'Why? The person who asked sees this.', button: 'Decline', done: 'Declined' },
  merge: { title: 'Merge', label: 'Into which request? Its votes move there.', button: 'Merge', done: 'Merged' },
  reply: { title: 'Reply to', label: 'Shown on the request for everyone.', button: 'Save reply', done: 'Reply saved' }
}
const copy = computed(() => COPY[props.action])

async function submit() {
  if (!props.request) return
  const body =
    props.action === 'decline' ? { action: 'decline', reason: textValue.value }
    : props.action === 'merge' ? { action: 'merge', into: Number(into.value) }
    : { action: 'reply', reply: textValue.value }
  busy.value = true
  try {
    await $fetch(`/api/requests/${props.request.id}`, { method: 'POST', body })
    toast.success(copy.value.done)
    open.value = false
    emit('done')
  } catch (err) {
    toast.error('Not saved', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{{ copy.title }} “{{ request?.title }}”</DialogTitle>
        <DialogDescription>{{ copy.label }}</DialogDescription>
      </DialogHeader>
      <Select v-if="action === 'merge'" v-model="into">
        <SelectTrigger class="w-full"><SelectValue placeholder="Pick a request" /></SelectTrigger>
        <SelectContent><SelectItem v-for="r in targets" :key="r.id" :value="String(r.id)">{{ r.title }} ({{ r.votes }})</SelectItem></SelectContent>
      </Select>
      <Textarea v-else v-model="textValue" rows="3" :maxlength="ROADMAP_LIMITS.reply" :aria-label="copy.label" />
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="busy || (action === 'merge' ? !into : action === 'decline' && !textValue.trim())" @click="submit">{{ copy.button }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
