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
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between gap-3">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The last 100 admin changes.</CardDescription>
        </div>
        <Button variant="outline" size="sm" @click="refresh()">Refresh</Button>
      </div>
    </CardHeader>
    <CardContent>
      <p v-if="!data?.length" class="text-sm text-muted-foreground">Nothing has been recorded yet.</p>
      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Who</TableHead>
            <TableHead>What</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="e in data" :key="e.id">
            <TableCell class="whitespace-nowrap">{{ when(e.at) }}</TableCell>
            <TableCell>{{ e.actorName ?? 'Unknown' }}</TableCell>
            <TableCell>{{ names[e.action] ?? e.action }}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
