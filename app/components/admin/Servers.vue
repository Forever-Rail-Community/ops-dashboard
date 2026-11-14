<script setup lang="ts">
// Game servers that run the agent. Each gets its own key, shown once, tied to one game.
import { Copy, KeyRound, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'

const { data: servers, refresh } = await useFetch<AgentInfo[]>('/api/admin/agents', { key: 'admin-agents' })

const form = reactive<{ id: string; game: GameKey }>({ id: '', game: 'run8' })
const busy = ref(false)
// The key just made, and for which server. Cleared once the admin dismisses it.
const shownKey = ref<{ id: string; key: string } | null>(null)

const gameName = (key: GameKey) => gameByKey(key).name
const lastReport = (at: number | null) => (at ? formatAge(Math.round((Date.now() - at) / 1000)) : 'Never')

async function run(request: () => Promise<{ key?: string }>, id: string, success: string) {
  busy.value = true
  try {
    const result = await request()
    if (result.key) shownKey.value = { id, key: result.key }
    toast.success(success)
    return true
  } catch (err: any) {
    toast.error('That did not work', { description: err?.data?.statusMessage ?? 'Try again.' })
    return false
  } finally {
    busy.value = false
    await refresh()
  }
}

async function addServer() {
  const id = form.id.trim()
  const added = await run(() => $fetch('/api/admin/agents', { method: 'POST', body: { id, game: form.game } }), id, 'Server added')
  if (added) form.id = ''
}

function newKey(id: string) {
  if (!confirm(`Make a new key for "${id}"? Its current key stops working right away.`)) return
  run(() => $fetch(`/api/admin/agents/${id}/key`, { method: 'POST' }), id, 'New key made')
}

function remove(id: string) {
  if (!confirm(`Remove "${id}"? Its key stops working and it disappears from the status pages.`)) return
  run(() => $fetch(`/api/admin/agents/${id}`, { method: 'DELETE' }), id, 'Server removed')
}

async function copyKey() {
  await navigator.clipboard.writeText(`AGENT_KEY=${shownKey.value!.key}`)
  toast.success('Copied')
}
</script>

<template>
  <div class="grid gap-6">
    <Alert v-if="shownKey">
      <KeyRound />
      <AlertTitle>Key for {{ shownKey.id }}</AlertTitle>
      <AlertDescription class="grid gap-3">
        <p>Copy this line into the agent's <code>.env</code> file on that server. It won't be shown again.</p>
        <div class="flex gap-2">
          <Input :model-value="`AGENT_KEY=${shownKey.key}`" readonly class="font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
          <Button variant="outline" @click="copyKey"><Copy /> Copy</Button>
        </div>
        <Button variant="ghost" size="sm" class="w-fit" @click="shownKey = null">I've saved it</Button>
      </AlertDescription>
    </Alert>

    <Card>
      <CardHeader>
        <CardTitle>Game servers</CardTitle>
        <CardDescription>Each server running the agent needs its own key. A key only works for the game you pick here.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6">
        <form class="flex flex-wrap items-end gap-3" @submit.prevent="addServer">
          <div class="grid gap-2">
            <Label for="server-name">Name</Label>
            <Input id="server-name" v-model="form.id" placeholder="run8-server" class="w-56" required />
          </div>
          <div class="grid gap-2">
            <Label>Game</Label>
            <Select v-model="form.game">
              <SelectTrigger class="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="g in GAMES" :key="g.key" :value="g.key">{{ g.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" :disabled="busy">Add server</Button>
        </form>

        <p v-if="!servers?.length" class="text-sm text-muted-foreground">No servers yet. Add one, then put its key on that server.</p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Last report</TableHead>
              <TableHead>Added by</TableHead>
              <TableHead class="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="s in servers" :key="s.id">
              <TableCell class="font-medium">{{ s.id }}</TableCell>
              <TableCell>{{ gameName(s.game) }}</TableCell>
              <TableCell>{{ lastReport(s.lastReportAt) }}</TableCell>
              <TableCell class="text-muted-foreground">{{ s.createdByName }}</TableCell>
              <TableCell>
                <div class="flex gap-1">
                  <Button variant="ghost" size="sm" :disabled="busy" @click="newKey(s.id)">New key</Button>
                  <Button variant="ghost" size="icon" class="size-8 text-destructive hover:text-destructive" :aria-label="`Remove ${s.id}`" :disabled="busy" @click="remove(s.id)">
                    <Trash2 />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
