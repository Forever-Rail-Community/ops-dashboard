<script setup lang="ts">
import { toast } from 'vue-sonner'
import { KeyRound, Plus, Users, X } from '@lucide/vue'

interface AccessData { roles: RoleDef[]; mappings: RoleMapping[] }

const { data } = await useFetch<AccessData>('/api/admin/access', { key: 'admin-access' })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const state = reactive<AccessData>(clone(data.value ?? { roles: [], mappings: [] }))
const saving = ref(false)
const { dirty, markSaved, discard } = useUnsavedChanges(state)

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
    markSaved()
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
    <PageSection :icon="KeyRound" title="Roles" description="What each role can do. People can hold several roles and get everything from all of them.">
      <template #action><Button size="sm" variant="outline" @click="addRole"><Plus />Add a role</Button></template>
      <div class="-mx-6 overflow-x-auto border-t">
        <table class="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr class="border-b">
              <th scope="col" class="w-[38%] px-6 py-3 text-left text-xs font-medium text-muted-foreground">Permission</th>
              <th v-for="role in state.roles" :key="role.key" scope="col" class="px-2 py-2 align-bottom">
                <div class="flex items-center justify-center gap-0.5">
                  <Input v-model="role.label" class="h-8 w-28 text-center font-semibold" :aria-label="`Name of the ${role.label} role`" />
                  <Button variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-destructive" :aria-label="`Remove the ${role.label} role`" @click="removeRole(role.key)"><X class="size-3.5" /></Button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(perms, group) in groups" :key="group">
              <tr><th :colspan="state.roles.length + 1" scope="colgroup" class="bg-muted/50 px-6 py-1.5 text-left text-xs font-semibold text-muted-foreground">{{ group }}</th></tr>
              <tr v-for="p in perms" :key="p.key" class="border-t">
                <th scope="row" class="px-6 py-2.5 text-left font-normal">{{ p.label }}</th>
                <td v-for="role in state.roles" :key="role.key" class="py-2.5 text-center">
                  <Checkbox
                    :model-value="role.permissions.includes(p.key)" :aria-label="`${role.label}: ${p.label}`"
                    @update:model-value="toggle(role, p.key, $event)"
                  />
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </PageSection>

    <PageSection
      :icon="Users" title="Discord roles" :count="state.mappings.length"
      description="Which Discord role gives which dashboard role. Anyone not in the server, or matching no line, can't sign in."
    >
      <template #action><Button size="sm" variant="outline" @click="addMapping"><Plus />Add a line</Button></template>
      <div v-for="(m, i) in state.mappings" :key="i" class="flex flex-wrap items-center gap-3 border-t py-3">
        <Input v-if="m.discordRoleId !== '*'" v-model="m.discordRoleId" placeholder="Discord role ID" class="w-56" aria-label="Discord role ID" />
        <span v-else class="w-56 text-sm font-medium">Any server member</span>
        <Button variant="ghost" size="sm" @click="m.discordRoleId = m.discordRoleId === '*' ? '' : '*'">
          {{ m.discordRoleId === '*' ? 'Use a role ID' : 'Any member' }}
        </Button>
        <span class="text-sm text-muted-foreground">gets</span>
        <Select v-model="m.roleKey">
          <SelectTrigger class="w-44" aria-label="Dashboard role"><SelectValue placeholder="Choose a role" /></SelectTrigger>
          <SelectContent><SelectItem v-for="r in state.roles" :key="r.key" :value="r.key">{{ r.label }}</SelectItem></SelectContent>
        </Select>
        <Button variant="ghost" size="icon" class="ml-auto size-8 text-muted-foreground hover:text-destructive" aria-label="Remove this line" @click="state.mappings.splice(i, 1)"><X class="size-4" /></Button>
      </div>
      <p class="border-t py-3 text-xs text-muted-foreground">
        To find a role ID, turn on Developer Mode in Discord, then right-click the role under Server Settings and choose Copy Role ID.
      </p>
    </PageSection>

    <AdminSaveBar :dirty="dirty" :saving="saving" @save="save" @discard="discard" />
  </div>
</template>
