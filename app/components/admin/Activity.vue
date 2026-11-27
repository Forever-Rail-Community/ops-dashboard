<script setup lang="ts">
interface Entry { id: number; at: string; actorName: string | null; action: string; detail: Record<string, unknown> | null }

const { data, refresh } = await useFetch<Entry[]>('/api/admin/activity', { key: 'admin-activity' })

const names: Record<string, string> = {
  'settings.update': 'Changed appearance or wording',
  'access.update': 'Changed roles or Discord access',
  'agents.create': 'Added a game server',
  'agents.key': 'Made a new key for a game server',
  'agents.delete': 'Removed a game server',
  'help.category.create': 'Added a help center category',
  'help.category.update': 'Changed a help center category',
  'help.category.delete': 'Removed a help center category',
  'help.article.publish': 'Published a help article',
  'help.article.unpublish': 'Unpublished a help article',
  'help.article.move': 'Moved a published help article',
  'help.article.feature': 'Featured a help article',
  'help.article.unfeature': 'Stopped featuring a help article',
  'help.article.delete': 'Deleted a help article',
  'update.publish': "Published a What's new update",
  'update.edit': "Edited a published What's new update",
  'update.delete': "Deleted a published What's new update",
  'roadmap.add': 'Added a roadmap item',
  'roadmap.move': 'Moved a roadmap item',
  'roadmap.remove': 'Removed a roadmap item',
  'request.accept': 'Accepted a feature request onto the roadmap',
  'request.decline': 'Declined a feature request',
  'request.merge': 'Merged a feature request into another',
  'request.reopen': 'Reopened a feature request',
  'bug.status': "Changed a bug report's status",
  'bug.delete': 'Deleted a bug report',
  'ticket.status': "Changed a ticket's status",
  'ticket.assign': 'Assigned a ticket',
  'discord.commands': 'Registered the Discord commands'
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
