<script setup lang="ts">
interface Entry { id: number; at: string; actorName: string | null; action: string; detail: Record<string, unknown> | null }

const { data, refresh } = await useFetch<Entry[]>('/api/admin/activity', { key: 'admin-activity' })

const names: Record<string, string> = {
  'settings.update': 'Changed appearance or wording',
  'access.update': 'Changed roles or Discord access'
}
const when = (iso: string) => new Date(iso).toLocaleString()
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold">Recent activity</h2>
        <UButton label="Refresh" color="neutral" variant="ghost" size="sm" @click="refresh()" />
      </div>
    </template>

    <p v-if="!data?.length" class="text-sm text-muted">Nothing has been recorded yet.</p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="text-muted">
          <tr>
            <th class="py-2 pr-4 font-medium">When</th>
            <th class="py-2 pr-4 font-medium">Who</th>
            <th class="py-2 font-medium">What</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in data" :key="e.id" class="border-t border-default">
            <td class="whitespace-nowrap py-2 pr-4">{{ when(e.at) }}</td>
            <td class="py-2 pr-4">{{ e.actorName ?? 'Unknown' }}</td>
            <td class="py-2">{{ names[e.action] ?? e.action }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
