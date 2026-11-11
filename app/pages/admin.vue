<script setup lang="ts">
const { user } = useUserSession()
const can = (p: string) => user.value?.permissions?.includes(p) ?? false

const tabs = computed(() =>
  [
    can('admin.settings') && { value: 'appearance', label: 'Appearance' },
    can('admin.roles') && { value: 'access', label: 'Access' },
    can('admin.activity') && { value: 'activity', label: 'Activity' }
  ].filter(Boolean) as { value: string; label: string }[]
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight">Admin</h2>
      <p class="text-sm text-muted-foreground">Change how the site looks and who can do what. Changes apply as soon as you save.</p>
    </div>

    <Tabs :default-value="tabs[0]?.value">
      <TabsList>
        <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</TabsTrigger>
      </TabsList>
      <TabsContent v-if="can('admin.settings')" value="appearance" class="pt-4">
        <AdminAppearance />
      </TabsContent>
      <TabsContent v-if="can('admin.roles')" value="access" class="pt-4">
        <AdminAccess />
      </TabsContent>
      <TabsContent v-if="can('admin.activity')" value="activity" class="pt-4">
        <AdminActivity />
      </TabsContent>
    </Tabs>
  </div>
</template>
