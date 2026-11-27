<script setup lang="ts">
// A ticket's status, worded for the viewer (see ticketStatus in utils/tickets.ts).
const props = defineProps<{ status: TicketStatus; staff: boolean }>()
const shown = computed(() => ticketStatus(props.status, props.staff))
</script>

<template>
  <PagePill :tone="shown.tone">{{ shown.label }}</PagePill>
</template>
