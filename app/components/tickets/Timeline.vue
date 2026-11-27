<script setup lang="ts">
// A ticket's history, oldest first: messages, staff's internal notes (staff only), and short lines for status changes
// and assignments. The submitter isn't shown "Waiting on submitter" lines: the ticket says it's their turn instead.
const props = defineProps<{ events: TicketEvent[]; staff: boolean }>()

const shown = computed(() => props.events.filter((e) => props.staff || !(e.type === 'status' && e.status === 'waiting')))
const initials = (name: string) => name.slice(0, 2).toUpperCase()

function line(e: TicketEvent) {
  if (e.type === 'opened') return `${e.author.name} opened this ticket`
  if (e.type === 'status') return `${e.author.name} changed the status to ${ticketStatus(e.status!, props.staff).label}`
  if (e.type === 'assigned') return e.assignee ? `Assigned to ${e.assignee.name}` : `${e.author.name} removed the assignee`
  return ''
}
</script>

<template>
  <ol class="flex flex-col gap-4">
    <li v-for="e in shown" :key="e.id">
      <div v-if="e.type === 'message' || e.type === 'note'" class="flex gap-3" :class="e.type === 'note' && 'rounded-xl border border-dashed border-amber-500/50 bg-amber-500/5 p-3'">
        <span class="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium">{{ initials(e.author.name) }}</span>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span class="font-medium">{{ e.author.name }}</span>
            <Badge v-if="e.author.staff" variant="secondary">Staff</Badge>
            <PagePill v-if="e.type === 'note'" tone="amber">Internal note · Staff only</PagePill>
            <span class="text-xs text-muted-foreground">{{ ticketTime(e.createdAt) }} · via {{ e.via }}</span>
          </div>
          <p class="mt-1 text-sm leading-relaxed whitespace-pre-line">{{ e.body }}</p>
        </div>
      </div>
      <div v-else class="flex items-center gap-2 pl-3 text-xs text-muted-foreground">
        <span class="size-1.5 rounded-full bg-muted-foreground/50" />{{ line(e) }} · {{ ticketTime(e.createdAt) }}
      </div>
    </li>
  </ol>
</template>
