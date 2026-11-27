<script setup lang="ts">
// A list of tickets to pick from, shared by My tickets and the staff inbox. Subjects wrap rather than cut off;
// staff also see the type, who opened it and who has it.
defineProps<{ tickets: TicketSummary[]; selectedId: number | null; staff: boolean }>()
defineEmits<{ select: [number] }>()
</script>

<template>
  <ul class="grid gap-1">
    <li v-for="t in tickets" :key="t.id">
      <button
        type="button"
        class="grid w-full gap-1 rounded-lg p-3 text-left hover:bg-accent"
        :class="{ 'bg-accent': t.id === selectedId }"
        :aria-current="t.id === selectedId ? 'true' : undefined"
        @click="$emit('select', t.id)"
      >
        <span class="flex items-start justify-between gap-3">
          <span class="font-medium">{{ t.subject }}</span>
          <TicketsStatusPill :status="t.status" :staff="staff" />
        </span>
        <span class="truncate text-xs text-muted-foreground">
          {{ ticketRef(t.id) }} ·
          <template v-if="staff">{{ ticketKindLabel(t.kind) }} · {{ t.submitter.name }} · {{ t.assignee?.name ?? 'Unassigned' }}</template>
          <template v-else>{{ ticketGameLabel(t.game) }}</template>
          · {{ shortDate(t.updatedAt) }}
        </span>
      </button>
    </li>
  </ul>
</template>
