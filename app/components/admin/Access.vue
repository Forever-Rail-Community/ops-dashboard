<script setup lang="ts">
interface AccessData { roles: RoleDef[]; mappings: RoleMapping[] }

const toast = useToast()
const { data } = await useFetch<AccessData>('/api/admin/access', { key: 'admin-access' })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const state = reactive<AccessData>(clone(data.value ?? { roles: [], mappings: [] }))
const saving = ref(false)

const groups = computed(() => {
  const out: Record<string, typeof PERMISSIONS[number][]> = {}
  for (const p of PERMISSIONS) (out[p.group] ??= []).push(p)
  return out
})

const roleItems = computed(() => state.roles.map((r) => ({ label: r.label, value: r.key })))

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
    toast.add({ title: 'Saved', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Could not save', description: err?.data?.statusMessage ?? 'Try again.', color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">Roles</h2>
          <p class="text-sm text-muted">A role is a named set of things a person can do. People can hold several roles and get everything from all of them.</p>
        </div>
      </template>

      <div class="space-y-6">
        <div v-for="role in state.roles" :key="role.key" class="space-y-3 rounded-lg border border-default p-4">
          <div class="flex items-center justify-between gap-3">
            <UInput v-model="role.label" class="w-64" aria-label="Role name" />
            <UButton label="Remove" color="error" variant="ghost" size="sm" @click="removeRole(role.key)" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div v-for="(perms, group) in groups" :key="group" class="space-y-2">
              <p class="text-sm font-medium text-muted">{{ group }}</p>
              <UCheckbox
                v-for="p in perms"
                :key="p.key"
                :model-value="role.permissions.includes(p.key)"
                :label="p.label"
                @update:model-value="toggle(role, p.key, $event)"
              />
            </div>
          </div>
        </div>

        <UButton label="Add a role" color="neutral" variant="subtle" @click="addRole" />
      </div>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">Discord roles</h2>
          <p class="text-sm text-muted">
            Choose which Discord roles get which dashboard role. To find a Discord role ID, turn on Developer Mode in Discord,
            then right-click the role under Server Settings and choose Copy Role ID. Anyone who isn't in the server, or matches
            no line here, can't sign in.
          </p>
        </div>
      </template>

      <div class="space-y-3">
        <div v-for="(m, i) in state.mappings" :key="i" class="flex flex-wrap items-center gap-3">
          <UInput
            v-if="m.discordRoleId !== '*'"
            v-model="m.discordRoleId"
            placeholder="Discord role ID"
            class="w-64"
            aria-label="Discord role ID"
          />
          <span v-else class="w-64 text-sm">Any server member</span>
          <UButton
            :label="m.discordRoleId === '*' ? 'Use a role ID' : 'Any member'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="m.discordRoleId = m.discordRoleId === '*' ? '' : '*'"
          />
          <span class="text-muted">gets</span>
          <USelect v-model="m.roleKey" :items="roleItems" class="w-48" aria-label="Dashboard role" />
          <UButton label="Remove" color="error" variant="ghost" size="sm" @click="state.mappings.splice(i, 1)" />
        </div>
        <UButton label="Add a line" color="neutral" variant="subtle" @click="addMapping" />
      </div>
    </UCard>

    <UButton label="Save access settings" :loading="saving" @click="save" />
  </div>
</template>
