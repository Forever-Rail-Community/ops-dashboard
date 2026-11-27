<script setup lang="ts">
import { MessageCircleReply } from '@lucide/vue'

// One ticket: what it is, its timeline, and the reply box. Staff controls (status, assignee, context) go in the
// `controls` slot. The submitter is told when it's their turn to reply.
const props = defineProps<{ ticket: Ticket; staff: boolean }>()
defineEmits<{ updated: [Ticket] }>()

const awaitingYou = computed(() => !props.staff && props.ticket.status === 'waiting')
</script>

<template>
  <section :aria-labelledby="`ticket-${ticket.id}`" class="flex min-w-0 flex-col gap-5 rounded-2xl border bg-card p-6 text-card-foreground">
    <header class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <TicketsStatusPill :status="ticket.status" :staff="staff" />
        {{ ticketRef(ticket.id) }} · {{ ticketKindLabel(ticket.kind) }} · {{ ticketGameLabel(ticket.game) }}
        <template v-if="staff"> · from {{ ticket.submitter.name }}</template>
      </div>
      <h2 :id="`ticket-${ticket.id}`" class="text-xl leading-tight font-semibold">{{ ticket.subject }}</h2>
    </header>

    <slot name="controls" />

    <Separator />
    <TicketsTimeline :events="ticket.events" :staff="staff" />
    <Separator />

    <div v-if="awaitingYou" role="status" class="flex gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm dark:border-violet-900 dark:bg-violet-950/40">
      <MessageCircleReply class="mt-0.5 size-4 shrink-0 text-violet-700 dark:text-violet-300" />
      <p><span class="font-medium">Awaiting your reply.</span> A staff member needs more information from you to continue.</p>
    </div>
    <TicketsComposer :ticket="ticket" :staff="staff" @updated="$emit('updated', $event)" />
  </section>
</template>
