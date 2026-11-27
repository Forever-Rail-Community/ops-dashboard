<script setup lang="ts">
import { Plus } from '@lucide/vue'

// Your support tickets: the list, and the one you picked with its timeline and a reply box.
definePageMeta({ title: 'My tickets' })

const { list, selectedId, ticket, loading, replace } = useTickets('mine')
</script>

<template>
  <PageBody>
    <PageHeader title="My tickets" description="Track your tickets and replies from staff. Only you and staff can see them.">
      <template #actions>
        <Button as-child><NuxtLink to="/tickets/new"><Plus />New ticket</NuxtLink></Button>
      </template>
    </PageHeader>

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
      <TicketsList v-if="list.data.value.length" :tickets="list.data.value" :selected-id="selectedId" :staff="false" @select="selectedId = $event" />
      <p v-else class="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        You haven’t opened any tickets. If something isn’t working, <NuxtLink to="/tickets/new" class="underline underline-offset-4">open one</NuxtLink>.
      </p>

      <TicketsDetail v-if="ticket" :ticket="ticket" :staff="false" @updated="replace" />
      <div v-else-if="loading" class="h-64 animate-pulse rounded-2xl border bg-muted/40" />
    </div>
  </PageBody>
</template>
