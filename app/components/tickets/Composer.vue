<script setup lang="ts">
import { toast } from 'vue-sonner'

// Replying on a ticket. Staff choose between a reply to the submitter and an internal note; the submitter can also
// mark their ticket solved. Ctrl/Cmd+Enter sends.
const props = defineProps<{ ticket: Ticket; staff: boolean }>()
const emit = defineEmits<{ updated: [Ticket] }>()

const mode = ref<'reply' | 'note'>('reply')
const draft = ref('')
const busy = ref(false)
watch(() => props.ticket.id, () => {
  draft.value = ''
  mode.value = 'reply'
})

const note = computed(() => props.staff && mode.value === 'note')
const hint = computed(() => {
  if (note.value) return 'Notes are visible only to staff.'
  if (props.staff) return `${props.ticket.submitter.name} will see this reply.`
  return props.ticket.status === 'solved' ? 'Replying will reopen this ticket.' : 'Staff will see your reply.'
})

async function send() {
  if (!draft.value.trim() || busy.value) return
  busy.value = true
  try {
    const ticket = await $fetch<Ticket>(`/api/tickets/${props.ticket.id}/messages`, { method: 'POST', body: { body: draft.value, note: note.value } })
    draft.value = ''
    emit('updated', ticket)
  } catch (err: any) {
    toast.error('Not sent', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

async function solve() {
  busy.value = true
  try {
    emit('updated', await $fetch<Ticket>(`/api/tickets/${props.ticket.id}`, { method: 'PUT', body: { status: 'solved' } }))
    toast.success('Marked as solved', { description: 'Reply anytime to reopen it.' })
  } catch (err: any) {
    toast.error('Not saved', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-2.5" @submit.prevent="send">
    <Tabs v-if="staff" v-model="mode">
      <TabsList>
        <TabsTrigger value="reply">Reply to submitter</TabsTrigger>
        <TabsTrigger value="note">Internal note</TabsTrigger>
      </TabsList>
    </Tabs>
    <Label v-else :for="`reply-${ticket.id}`">Reply</Label>
    <Textarea
      :id="`reply-${ticket.id}`"
      v-model="draft"
      rows="3"
      :maxlength="TICKET_LIMITS.body"
      :aria-label="note ? 'Internal note' : 'Reply'"
      :placeholder="note ? 'Add a note for staff' : staff ? `Reply to ${ticket.submitter.name}` : 'Write a reply'"
      :class="note && 'border-dashed border-amber-500/60 bg-amber-500/5'"
      @keydown.meta.enter.prevent="send"
      @keydown.ctrl.enter.prevent="send"
    />
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs text-muted-foreground">{{ hint }}</span>
      <Button v-if="!staff && ticket.status !== 'solved'" type="button" variant="outline" class="ml-auto" :disabled="busy" @click="solve">Mark as solved</Button>
      <Button type="submit" :class="(staff || ticket.status === 'solved') && 'ml-auto'" :disabled="busy || !draft.trim()">
        {{ note ? 'Add note' : 'Send reply' }}
      </Button>
    </div>
  </form>
</template>
