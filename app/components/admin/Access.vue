<script setup lang="ts">
import { toast } from 'vue-sonner'

interface AccessData { roles: RoleDef[]; mappings: RoleMapping[] }

const { data } = await useFetch<AccessData>('/api/admin/access', { key: 'admin-access' })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const state = reactive<AccessData>(clone(data.value ?? { roles: [], mappings: [] }))
const saving = ref(false)

const groups = computed(() => {
  const out: Record<string, (typeof PERMISSIONS)[number][]> = {}
  for (const p of PERMISSIONS) (out[p.group] ??= []).push(p)
  return out
})

function toggle(role: RoleDef, key: string, on: boolean | 'indeterminate') {
  const has = role.permissions.includes(key)
  if (on === true && !has) role.permissions.push(key)
  if (on !== true && has) role.permissions = role.permissions.filter((p) => p !== key)
}

function addRole() {
  state.roles.push({ key: 'role-' + Date.now().toString(36), label: 'New role', permissions: ['status.view'] })
}

function removeRole(key: string) {
  state.roles = state.roles.filter((r) => r.key !== key)
  state.mappings = state.mappings.filter((m) => m.roleKey !== key)
}

function addMapping() {
  state.mappings.push({ discordRoleId: '', roleKey: state.roles[0]?.key ?? '' })
}

async function save() {
  saving.value = true
  try {
    const result = await $fetch<AccessData>('/api/admin/access', { method: 'PUT', body: state })
    Object.assign(state, clone(result))
    toast.success('Saved')
  } catch (err: any) {
    toast.error('Could not save', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>
          A role is a named set of things a person can do. People can hold several roles and get everything from all of them.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4">
        <div v-for="role in state.roles" :key="role.key" class="flex flex-col gap-4 rounded-lg border p-4">
          <div class="flex items-center justify-between gap-3">
            <Input v-model="role.label" class="max-w-64" aria-label="Role name" />
            <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="removeRole(role.key)">Remove</Button>
          </div>
          <div class="grid gap-6 sm:grid-cols-2">
            <div v-for="(perms, group) in groups" :key="group" class="flex flex-col gap-3">
              <p class="text-sm font-medium text-muted-foreground">{{ group }}</p>
              <div v-for="p in perms" :key="p.key" class="flex items-center gap-2">
                <Checkbox
                  :id="`${role.key}-${p.key}`"
                  :model-value="role.permissions.includes(p.key)"
                  @update:model-value="toggle(role, p.key, $event)"
                />
                <Label :for="`${role.key}-${p.key}`" class="font-normal">{{ p.label }}</Label>
              </div>
            </div>
          </div>
        </div>
        <div><Button variant="outline" @click="addRole">Add a role</Button></div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Discord roles</CardTitle>
        <CardDescription>
          Choose which Discord roles get which dashboard role. To find a Discord role ID, turn on Developer Mode in Discord, then
          right-click the role under Server Settings and choose Copy Role ID. Anyone who isn't in the server, or matches no line
          here, can't sign in.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-3">
        <div v-for="(m, i) in state.mappings" :key="i" class="flex flex-wrap items-center gap-3">
          <Input
            v-if="m.discordRoleId !== '*'"
            v-model="m.discordRoleId"
            placeholder="Discord role ID"
            class="w-64"
            aria-label="Discord role ID"
          />
          <span v-else class="w-64 text-sm">Any server member</span>
          <Button variant="ghost" size="sm" @click="m.discordRoleId = m.discordRoleId === '*' ? '' : '*'">
            {{ m.discordRoleId === '*' ? 'Use a role ID' : 'Any member' }}
          </Button>
          <span class="text-sm text-muted-foreground">gets</span>
          <Select v-model="m.roleKey">
            <SelectTrigger class="w-48" aria-label="Dashboard role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="r in state.roles" :key="r.key" :value="r.key">{{ r.label }}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" class="text-destructive hover:text-destructive" @click="state.mappings.splice(i, 1)">Remove</Button>
        </div>
        <div><Button variant="outline" @click="addMapping">Add a line</Button></div>
      </CardContent>
    </Card>

    <div><Button :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save access settings' }}</Button></div>
  </div>
</template>
