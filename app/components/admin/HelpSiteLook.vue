<script setup lang="ts">
// Appearance > Help site: the accent colors and the home page hero image of the public help site.
import { ImagePlus, X } from '@lucide/vue'
import { toast } from 'vue-sonner'

const lightColor = defineModel<string>('light', { required: true })
const darkColor = defineModel<string>('dark', { required: true })
const heroImage = defineModel<string>('image', { required: true })
const overlay = defineModel<number>('overlay', { required: true })

const fileInput = ref<HTMLInputElement>()
const uploading = ref(false)

async function onImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    heroImage.value = (await $fetch<{ url: string }>('/api/admin/hero-image', { method: 'POST', body })).url
    toast.success('Image uploaded. Save changes to use it.')
  } catch (err: any) {
    toast.error('Could not upload the image', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    uploading.value = false
  }
}

// Roughly what the band looks like over the image in each mode. Like the help site (its src/lib/colors.ts), the
// dark mode band starts from a deep shade of the color, 55% of the way to the dark background. The help site may
// adjust the shade or cover the image more strongly if text over it would be hard to read.
const bandColors = computed(() => ({ Light: lightColor.value, Dark: `color-mix(in srgb, ${darkColor.value} 45%, #09090b)` }))
const preview = (band: string) => {
  const cover = `color-mix(in srgb, ${band} ${overlay.value}%, transparent)`
  return { backgroundImage: `linear-gradient(${cover}, ${cover}), url("${heroImage.value}")` }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Help site</CardTitle>
      <CardDescription>
        Colors and the home page image of the public help site. The help site rebuilds when you save.
      </CardDescription>
    </CardHeader>
    <CardContent class="grid gap-8">
      <div class="grid gap-6 sm:grid-cols-2">
        <div class="grid gap-2">
          <Label>Light mode color</Label>
          <AdminColorField v-model="lightColor" label="Help site light mode color" />
        </div>
        <div class="grid gap-2">
          <Label>Dark mode color</Label>
          <AdminColorField v-model="darkColor" label="Help site dark mode color" />
        </div>
      </div>

      <div class="grid gap-3">
        <div>
          <Label>Home page image</Label>
          <p class="mt-1 text-xs text-muted-foreground">
            Shown behind the header and search on the home page, under the mode's color. A wide image works best,
            at least 1600 pixels across. PNG, JPG, WebP, or GIF, up to 4 MB.
          </p>
        </div>
        <div v-if="heroImage" class="grid gap-2 sm:grid-cols-2">
          <div v-for="(band, mode) in bandColors" :key="mode" class="grid gap-1">
            <div class="aspect-[16/6] rounded-lg border bg-cover bg-center" :style="preview(band)" role="img" :aria-label="`${mode} mode preview`" />
            <span class="text-xs text-muted-foreground">{{ mode }} mode</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" :disabled="uploading" @click="fileInput?.click()">
            <ImagePlus /> {{ uploading ? 'Uploading…' : heroImage ? 'Replace image' : 'Upload image' }}
          </Button>
          <Button v-if="heroImage" type="button" variant="ghost" @click="heroImage = ''"><X /> Remove</Button>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onImage" />
        </div>
        <div class="grid gap-2">
          <Label for="hero-address" class="text-xs font-normal text-muted-foreground">Or paste an image address (https://)</Label>
          <Input id="hero-address" v-model="heroImage" placeholder="https://" class="max-w-lg" />
        </div>
      </div>

      <div v-if="heroImage" class="grid max-w-lg gap-2">
        <Label for="hero-overlay">Color over the image: {{ overlay }}%</Label>
        <input id="hero-overlay" v-model.number="overlay" type="range" min="0" max="100" step="5" class="w-full accent-primary" />
        <p class="text-xs text-muted-foreground">
          Lower shows more of the image. If text over it would be hard to read, the help site uses a stronger color for you.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
