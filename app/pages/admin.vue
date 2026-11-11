<script setup lang="ts">
const { user } = useUserSession()
const can = (p: string) => user.value?.permissions?.includes(p) ?? false

const items = computed(() =>
  [
    can('admin.settings') && { label: 'Appearance', slot: 'appearance' },
    can('admin.roles') && { label: 'Access', slot: 'access' },
    can('admin.activity') && { label: 'Activity', slot: 'activity' }
  ].filter(Boolean) as { label: string; slot: string }[]
)
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h1 class="text-3xl font-semibold">Admin</h1>
      <p class="text-muted">Change how the site looks and who can do what. Changes apply as soon as you save.</p>
    </div>

    <UTabs :items="items" class="w-full">
      <template #appearance>
        <AdminAppearance class="pt-4" />
      </template>
      <template #access>
        <AdminAccess class="pt-4" />
      </template>
      <template #activity>
        <AdminActivity class="pt-4" />
      </template>
    </UTabs>
  </div>
</template>
