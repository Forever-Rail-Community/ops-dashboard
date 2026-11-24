<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ImagePlus, Send, X } from '@lucide/vue'

// Reporting a bug: what's wrong, where, what happened, and up to three screenshots (pasted, dropped or picked).
const props = defineProps<{ screenshots: boolean }>()
const emit = defineEmits<{ sent: []; cancel: [] }>()

const form = ref({ title: '', area: BUG_AREAS[0]!, body: '' })
const files = ref<{ file: File; preview: string }[]>([])
const busy = ref(false)
const dragging = ref(false)
const picker = ref<HTMLInputElement>()

function add(list: Iterable<File>) {
  for (const file of list) {
    if (!file.type.startsWith('image/')) continue
    if (files.value.length >= BUG_LIMITS.screenshots) {
      toast.warning(`Up to ${BUG_LIMITS.screenshots} screenshots`)
      break
    }
    files.value.push({ file, preview: URL.createObjectURL(file) })
  }
}
function remove(i: number) {
  URL.revokeObjectURL(files.value[i]!.preview)
  files.value.splice(i, 1)
}
const onPaste = (e: ClipboardEvent) => props.screenshots && e.clipboardData && add(e.clipboardData.files)
const onDrop = (e: DragEvent) => {
  dragging.value = false
  if (props.screenshots && e.dataTransfer) add(e.dataTransfer.files)
}
onBeforeUnmount(() => files.value.forEach((f) => URL.revokeObjectURL(f.preview)))

async function send() {
  busy.value = true
  let report: BugReport
  try {
    report = await $fetch<BugReport>('/api/bugs', { method: 'POST', body: form.value })
  } catch (err: any) {
    toast.error('Not sent', { description: err?.data?.statusMessage ?? 'Try again.' })
    busy.value = false
    return
  }
  // The report is saved; screenshots go up one at a time, and one failing doesn't lose the report.
  let failed = 0
  for (const { file } of files.value) {
    try {
      const body = new FormData()
      const image = await shrinkImage(file)
      body.append('file', image, `screenshot.${image.type.split('/')[1]}`)
      await $fetch(`/api/bugs/${report.id}/screenshots`, { method: 'POST', body })
    } catch {
      failed++
    }
  }
  busy.value = false
  if (failed) toast.warning(`Report #${report.id} sent`, { description: `${failed} screenshot${failed > 1 ? 's' : ''} couldn't be added.` })
  else toast.success(`Report #${report.id} sent`, { description: 'Staff will look at it; its status shows here.' })
  files.value.forEach((f) => URL.revokeObjectURL(f.preview))
  files.value = []
  form.value = { title: '', area: BUG_AREAS[0]!, body: '' }
  emit('sent')
}
</script>

<template>
  <form class="grid gap-3.5" @paste="onPaste" @submit.prevent="send">
    <div class="grid gap-1.5">
      <Label for="bug-title">What's wrong?</Label>
      <Input id="bug-title" v-model="form.title" :maxlength="BUG_LIMITS.title" placeholder="Train tag covers the industry name in Bryson" />
    </div>
    <div class="grid gap-1.5">
      <Label for="bug-area">Where?</Label>
      <Select v-model="form.area">
        <SelectTrigger id="bug-area" class="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem v-for="a in BUG_AREAS" :key="a" :value="a">{{ a }}</SelectItem></SelectContent>
      </Select>
    </div>
    <div class="grid gap-1.5">
      <Label for="bug-body">What happened, and what did you expect?</Label>
      <Textarea id="bug-body" v-model="form.body" rows="4" :maxlength="BUG_LIMITS.body" placeholder="Steps to see it, what you saw, what should have happened" />
    </div>
    <div v-if="screenshots" class="grid gap-1.5">
      <Label>Screenshots <span class="font-normal text-muted-foreground">(up to {{ BUG_LIMITS.screenshots }})</span></Label>
      <div class="flex flex-wrap gap-2" @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="onDrop">
        <div v-for="(f, i) in files" :key="f.preview" class="relative size-20 overflow-hidden rounded-lg border bg-muted">
          <img :src="f.preview" alt="" class="size-full object-cover" />
          <button type="button" class="absolute top-1 right-1 rounded-full border bg-background p-0.5" :aria-label="`Remove screenshot ${i + 1}`" @click="remove(i)"><X class="size-3" /></button>
        </div>
        <button
          v-if="files.length < BUG_LIMITS.screenshots"
          type="button"
          class="flex size-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-accent"
          :class="{ 'border-primary bg-accent': dragging }"
          @click="picker?.click()"
        >
          <ImagePlus class="size-5" />Add
        </button>
        <input ref="picker" type="file" accept="image/png,image/jpeg,image/webp" multiple class="hidden" @change="(e) => { add((e.target as HTMLInputElement).files ?? []); (e.target as HTMLInputElement).value = '' }" />
      </div>
      <p class="text-xs text-muted-foreground">Paste, drop or pick images. Only you and staff can see them.</p>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="button" variant="outline" @click="emit('cancel')">Cancel</Button>
      <Button type="submit" :disabled="busy || !form.title.trim() || !form.body.trim()"><Send />{{ busy ? 'Sending…' : 'Send report' }}</Button>
    </div>
  </form>
</template>
