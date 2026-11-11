<script setup lang="ts">
const toast = useToast()
const { data } = await useFetch<SiteSettings>('/api/admin/settings', { key: 'admin-settings' })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const form = reactive<SiteSettings>(clone(data.value ?? DEFAULT_SITE))
const saving = ref(false)

function onLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
    toast.add({ title: 'Use a PNG, JPG, WebP, or SVG image', color: 'error' })
    return
  }
  if (file.size > 250_000) {
    toast.add({ title: 'That image is over 250 KB. Use a smaller one.', color: 'error' })
    return
  }
  const reader = new FileReader()
  reader.onload = () => { form.logo = String(reader.result) }
  reader.readAsDataURL(file)
}

function resetDefaults() {
  Object.assign(form, clone(DEFAULT_SITE))
}

async function save() {
  saving.value = true
  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: form })
    await refreshNuxtData('site')
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
      <template #header><h2 class="font-semibold">Name and logo</h2></template>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField label="Site name">
          <UInput v-model="form.name" class="w-full" />
        </UFormField>
        <UFormField label="Subtitle" description="Shown under the name. Can be empty.">
          <UInput v-model="form.subtitle" class="w-full" />
        </UFormField>
        <UFormField label="Logo" description="PNG, JPG, WebP, or SVG, up to 250 KB." class="sm:col-span-2">
          <div class="flex items-center gap-4">
            <img :src="form.logo" alt="Logo preview" class="size-16 rounded-lg border border-default object-contain" />
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="text-sm" @change="onLogo" />
            <UButton label="Use default logo" color="neutral" variant="ghost" size="sm" @click="form.logo = '/logo.svg'" />
          </div>
        </UFormField>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Color</h2></template>
      <UFormField label="Main color" description="Used for buttons and highlights. Pick a medium or dark color so white text stays readable.">
        <div class="flex items-center gap-3">
          <input v-model="form.brandColor" type="color" class="h-10 w-14 cursor-pointer rounded border border-default" aria-label="Main color" />
          <UInput v-model="form.brandColor" class="w-32" />
        </div>
      </UFormField>
    </UCard>

    <UCard>
      <template #header>
        <div>
          <h2 class="font-semibold">Wording</h2>
          <p class="text-sm text-muted">Rename the words the site uses. For example, change "Train" to "Job".</p>
        </div>
      </template>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UFormField v-for="f in LABEL_FIELDS" :key="f.key" :label="f.title">
          <UInput v-model="form.labels[f.key]" class="w-full" />
        </UFormField>
      </div>
    </UCard>

    <div class="flex items-center gap-3">
      <UButton label="Save changes" :loading="saving" @click="save" />
      <UButton label="Reset to defaults" color="neutral" variant="ghost" @click="resetDefaults" />
    </div>
  </div>
</template>
