<script setup lang="ts">
import { toast } from 'vue-sonner'

// Staff's ticket inbox: filter the list, open a ticket, and work it: status, assignee, replies and internal notes.
definePageMeta({ title: 'Tickets' })

const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const { list, selectedId, ticket, replace } = useTickets('all')
const { data: people } = useFetch<{ id: string; name: string }[]>('/api/tickets/staff', { default: () => [] })

const FILTERS = [
  { value: 'mine', label: 'Mine', test: (t: TicketSummary) => t.assignee?.id === user.value?.id && t.status !== 'solved' },
  { value: 'unassigned', label: 'Unassigned', test: (t: TicketSummary) => !t.assignee && t.status !== 'solved' },
  { value: 'open', label: 'All open', test: (t: TicketSummary) => t.status !== 'solved' },
  { value: 'solved', label: 'Solved', test: (t: TicketSummary) => t.status === 'solved' }
] as const
type Filter = (typeof FILTERS)[number]['value']

const filter = computed<Filter>({
  get: () => (FILTERS.some((f) => f.value === route.query.view) ? (route.query.view as Filter) : 'open'),
  set: (value) => router.replace({ query: { ...route.query, view: value === 'open' ? undefined : value } })
})
const shown = computed(() => list.data.value.filter(FILTERS.find((f) => f.value === filter.value)!.test))
const count = (f: (typeof FILTERS)[number]) => list.data.value.filter(f.test).length

// Assignee choices: whoever is assigned now, plus staff who have worked on tickets (you first).
const assignees = computed(() => {
  const current = ticket.value?.assignee
  return current && !people.value.some((p) => p.id === current.id) ? [...people.value, current] : people.value
})

async function change(body: { status?: TicketStatus; assignee?: { id: string; name: string } | null }) {
  if (!ticket.value) return
  try {
    await replace(await $fetch<Ticket>(`/api/tickets/${ticket.value.id}`, { method: 'PUT', body }))
  } catch (err: any) {
    toast.error('Not saved', { description: err?.data?.statusMessage ?? 'Try again.' })
  }
}
const setStatus = (value: unknown) => change({ status: value as TicketStatus })
const setAssignee = (value: unknown) => change({ assignee: assignees.value.find((p) => p.id === value) ?? null })

const contextRows = computed(() => {
  const c = ticket.value?.context
  return [
    { label: 'Opened from', value: c?.page },
    { label: 'Browser', value: c?.browser }
  ].filter((r) => r.value)
})
</script>

<template>
  <PageBody>
    <PageHeader title="Tickets" description="Every ticket from members. Reply, add internal notes, and set the status and assignee." />

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
      <div class="grid content-start gap-3">
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
          <button
            v-for="f in FILTERS"
            :key="f.value"
            type="button"
            class="rounded-full border px-3 py-1 text-sm"
            :class="filter === f.value ? 'bg-accent font-medium' : 'text-muted-foreground'"
            :aria-pressed="filter === f.value"
            @click="filter = f.value"
          >
            {{ f.label }} <span class="text-muted-foreground">{{ count(f) }}</span>
          </button>
        </div>
        <p v-if="!shown.length" class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No tickets match this filter.</p>
        <TicketsList :tickets="shown" :selected-id="selectedId" :staff="true" @select="selectedId = $event" />
      </div>

      <TicketsDetail v-if="ticket" :ticket="ticket" :staff="true" @updated="replace">
        <template #controls>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="grid gap-1.5">
              <Label for="ticket-status">Status</Label>
              <Select :model-value="ticket.status" @update:model-value="setStatus">
                <SelectTrigger id="ticket-status" class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem v-for="s in TICKET_STATUSES" :key="s.value" :value="s.value">{{ s.staffLabel }}</SelectItem></SelectContent>
              </Select>
            </div>
            <div class="grid gap-1.5">
              <Label for="ticket-assignee">Assigned to</Label>
              <Select :model-value="ticket.assignee?.id ?? 'none'" @update:model-value="setAssignee">
                <SelectTrigger id="ticket-assignee" class="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  <SelectItem v-for="p in assignees" :key="p.id" :value="p.id">{{ p.id === user?.id ? `${p.name} (you)` : p.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <dl v-if="contextRows.length" class="grid gap-x-6 gap-y-2 rounded-xl border bg-muted/40 px-4 py-3 text-sm sm:grid-cols-2">
            <div v-for="r in contextRows" :key="r.label">
              <dt class="text-xs text-muted-foreground">{{ r.label }}</dt>
              <dd>{{ r.value }}</dd>
            </div>
          </dl>
        </template>
      </TicketsDetail>
    </div>
  </PageBody>
</template>
