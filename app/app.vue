<script setup lang="ts">
await useFetch<SiteSettings>('/api/site', { key: 'site' })
const { site } = useSite()
const { bootScript } = useTheme()

useHead(() => ({
  title: `${site.value.name} ${site.value.subtitle}`.trim(),
  link: [{ rel: 'icon', href: site.value.logo }],
  style: [{ key: 'brand-theme', innerHTML: brandCss(site.value.brandColor) }],
  // Runs before the page paints so a saved dark choice never flashes white.
  script: [{ key: 'theme-boot', innerHTML: bootScript, tagPosition: 'head' }]
}))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <Toaster position="top-right" />
</template>
