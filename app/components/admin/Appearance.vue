<script setup lang="ts">
import { toast } from 'vue-sonner'

const { data } = await useFetch<SiteSettings>('/api/admin/settings', { key: 'admin-settings' })

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))
const form = reactive<SiteSettings>(clone(data.value ?? DEFAULT_SITE))
const saving = ref(false)

function onLogo(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
    toast.error('Use a PNG, JPG, WebP, or SVG image')
    return
  }
  if (file.size > 250_000) {
    toast.error('That image is over 250 KB. Use a smaller one.')
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
    <Card>
      <CardHeader>
        <CardTitle>Name and logo</CardTitle>
        <CardDescription>Shown in the sidebar and on the sign-in page (the name, beside the logo).</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6 sm:grid-cols-2">
        <div class="grid gap-2">
          <Label for="site-name">Site name</Label>
          <Input id="site-name" v-model="form.name" />
        </div>
        <div class="grid gap-2">
          <Label for="site-subtitle">Subtitle</Label>
          <Input id="site-subtitle" v-model="form.subtitle" />
          <p class="text-xs text-muted-foreground">Shown under the name. Can be empty.</p>
        </div>
        <div class="grid gap-2 sm:col-span-2">
          <Label for="site-logo">Logo</Label>
          <div class="flex flex-wrap items-center gap-4">
            <img :src="form.logo" alt="Logo preview" class="size-16 rounded-lg border object-contain" />
            <Input id="site-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="max-w-xs" @change="onLogo" />
            <Button type="button" variant="ghost" size="sm" @click="form.logo = '/logo.svg'">Use default logo</Button>
          </div>
          <p class="text-xs text-muted-foreground">PNG, JPG, WebP, or SVG, up to 250 KB.</p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Color</CardTitle>
        <CardDescription>Used for buttons, highlights, and the active menu item. Pick a medium or dark color so text on it stays readable.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminColorField v-model="form.brandColor" label="Main color" />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Sign-in page</CardTitle>
        <CardDescription>What people see before they sign in.</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6 sm:grid-cols-2">
        <div class="grid gap-2">
          <Label for="member-role">Member role</Label>
          <Input id="member-role" v-model="form.memberRole" />
          <p class="text-xs text-muted-foreground">The Discord role people need to sign in, named under the sign-in button. Renaming it here doesn't change who can sign in: that's set in Access.</p>
        </div>
        <div class="flex items-start gap-3">
          <Checkbox id="login-live" :model-value="form.loginLive" class="mt-0.5" @update:model-value="form.loginLive = $event === true" />
          <div class="grid gap-1.5">
            <Label for="login-live">Show what's running behind the sign-in</Label>
            <p class="text-xs text-muted-foreground">
              The Railroader map with trains moving, and cards as trains start and stop, signals change and servers come up.
              It's public: anyone who opens the sign-in page sees locomotive numbers, speeds, car counts, nearby towns and signal names.
              Visitors can also turn it off for themselves.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <AdminHelpSiteLook
      v-model:light="form.helpLightAccent"
      v-model:dark="form.helpDarkAccent"
      v-model:image="form.helpHeroImage"
      v-model:overlay="form.helpHeroOverlay"
    />

    <Card>
      <CardHeader>
        <CardTitle>Wording</CardTitle>
        <CardDescription>Rename the words the site uses. For example, change "Train" to "Job".</CardDescription>
      </CardHeader>
      <CardContent class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="f in LABEL_FIELDS" :key="f.key" class="grid gap-2">
          <Label :for="`label-${f.key}`">{{ f.title }}</Label>
          <Input :id="`label-${f.key}`" v-model="form.labels[f.key]" />
        </div>
      </CardContent>
    </Card>

    <div class="flex items-center gap-3">
      <Button :disabled="saving" @click="save">{{ saving ? 'Saving…' : 'Save changes' }}</Button>
      <Button variant="ghost" @click="resetDefaults">Reset to defaults</Button>
    </div>
  </div>
</template>
