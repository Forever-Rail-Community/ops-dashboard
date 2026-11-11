<script setup lang="ts">
await useFetch<SiteSettings>('/api/site', { key: 'site' })
const { site } = useSite()

useHead(() => ({
  title: `${site.value.name} ${site.value.subtitle}`.trim(),
  link: [{ rel: 'icon', href: site.value.logo }],
  style: [{ key: 'brand-theme', innerHTML: brandCss(site.value.brandColor) }]
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster position="top-right" />
</template>
