// Site name, logo, color, and wording. app.vue loads it once; everything else just reads it.
export function useSite() {
  const { data } = useNuxtData<SiteSettings>('site')
  const site = computed<SiteSettings>(() => data.value ?? DEFAULT_SITE)
  const t = (key: string) => site.value.labels[key] ?? DEFAULT_LABELS[key] ?? key
  return { site, t }
}
