<script setup lang="ts">
definePageMeta({ title: 'Admin' })

const { user } = useUserSession()
const can = (p: string) => user.value?.permissions?.includes(p) ?? false

const tabs = computed(() =>
  [
    can('admin.settings') && { value: 'appearance', label: 'Appearance' },
    can('admin.roles') && { value: 'access', label: 'Access' },
    can('admin.agents') && { value: 'servers', label: 'Servers' },
    can('admin.settings') && { value: 'discord', label: 'Discord' },
    can('admin.lines') && { value: 'lines', label: 'CTC lines' },
    can('admin.activity') && { value: 'activity', label: 'Activity' }
  ].filter(Boolean) as { value: string; label: string }[]
)
</script>

<template>
  <PageBody>
    <PageHeader title="Admin" description="How the site looks, who can do what, the game servers and the CTC board's lines. Changes apply as soon as you save." />

    <Tabs :default-value="tabs[0]?.value">
      <TabsList>
        <TabsTrigger v-for="t in tabs" :key="t.value" :value="t.value">{{ t.label }}</TabsTrigger>
      </TabsList>
      <TabsContent v-if="can('admin.settings')" value="appearance" class="pt-2">
        <AdminAppearance />
      </TabsContent>
      <TabsContent v-if="can('admin.roles')" value="access" class="pt-2">
        <AdminAccess />
      </TabsContent>
      <TabsContent v-if="can('admin.agents')" value="servers" class="pt-2">
        <AdminServers />
      </TabsContent>
      <TabsContent v-if="can('admin.settings')" value="discord" class="pt-2">
        <AdminDiscord />
      </TabsContent>
      <TabsContent v-if="can('admin.lines')" value="lines" class="pt-2">
        <AdminCtcLines />
      </TabsContent>
      <TabsContent v-if="can('admin.activity')" value="activity" class="pt-2">
        <AdminActivity />
      </TabsContent>
    </Tabs>
  </PageBody>
</template>
