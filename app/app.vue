<script setup lang="ts">
await useFetch<SiteSettings>('/api/site', { key: 'site' })
const { site } = useSite()
const { bootScript, isDark } = useTheme()
// A dispatcher on a CTC desk stays on it while any page of the site is open.
useDeskBeat()

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
  <!-- A request for, or takeover of, your CTC desk shows on any page. -->
  <CtcDeskRequests />
  <!-- The theme sets the toasts' own text colors, which otherwise stay light-mode gray in dark mode. -->
  <Toaster position="bottom-right" :theme="isDark ? 'dark' : 'light'" />
</template>
