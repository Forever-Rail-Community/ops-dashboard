<script setup lang="ts">
// Formatting buttons for the article editor. Each button is one entry in `groups`, so adding one is one line.
import type { Editor } from '@tiptap/vue-3'
import type { Component } from 'vue'
import {
  Bold, ChevronDown, Heading2, Heading3, ImagePlus, Italic, Lightbulb, Link, List, ListOrdered, Minus, Quote,
  Redo2, Table, Undo2
} from '@lucide/vue'
import { toast } from 'vue-sonner'

const props = defineProps<{ editor: Editor }>()

interface Tool {
  label: string
  icon: Component
  run: () => void
  active?: () => boolean
  disabled?: () => boolean
}

const chain = () => props.editor.chain().focus()

function editLink() {
  const current = props.editor.getAttributes('link').href as string | undefined
  const href = prompt('Link address (leave empty to remove the link)', current ?? 'https://')
  if (href === null) return
  if (!href.trim()) chain().extendMarkRange('link').unsetLink().run()
  else chain().extendMarkRange('link').setLink({ href: href.trim() }).run()
}

const groups: Tool[][] = [
  [
    { label: 'Heading', icon: Heading2, run: () => chain().toggleHeading({ level: 2 }).run(), active: () => props.editor.isActive('heading', { level: 2 }) },
    { label: 'Subheading', icon: Heading3, run: () => chain().toggleHeading({ level: 3 }).run(), active: () => props.editor.isActive('heading', { level: 3 }) }
  ],
  [
    { label: 'Bold', icon: Bold, run: () => chain().toggleBold().run(), active: () => props.editor.isActive('bold') },
    { label: 'Italic', icon: Italic, run: () => chain().toggleItalic().run(), active: () => props.editor.isActive('italic') },
    { label: 'Link', icon: Link, run: editLink, active: () => props.editor.isActive('link') }
  ],
  [
    { label: 'Bulleted list', icon: List, run: () => chain().toggleBulletList().run(), active: () => props.editor.isActive('bulletList') },
    { label: 'Numbered list', icon: ListOrdered, run: () => chain().toggleOrderedList().run(), active: () => props.editor.isActive('orderedList') },
    { label: 'Quote', icon: Quote, run: () => chain().toggleBlockquote().run(), active: () => props.editor.isActive('blockquote') },
    { label: 'Divider', icon: Minus, run: () => chain().setHorizontalRule().run() },
    { label: 'Table', icon: Table, run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), disabled: () => props.editor.isActive('table') }
  ]
]

const history: Tool[] = [
  { label: 'Undo', icon: Undo2, run: () => chain().undo().run(), disabled: () => !props.editor.can().undo() },
  { label: 'Redo', icon: Redo2, run: () => chain().redo().run(), disabled: () => !props.editor.can().redo() }
]

// Images go to Vercel Blob first; the article stores the address.
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
    const { url } = await $fetch<{ url: string }>('/api/help/images', { method: 'POST', body })
    chain().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, '') }).run()
  } catch (err: any) {
    toast.error('Could not add the image', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <!-- mousedown.prevent keeps focus and the selection in the editor when a button is pressed. -->
  <div role="toolbar" aria-label="Formatting" class="flex flex-wrap items-center gap-0.5 border-b p-1.5" @mousedown.prevent>
    <template v-for="(group, i) in groups" :key="i">
      <Separator v-if="i > 0" orientation="vertical" class="mx-1 data-[orientation=vertical]:h-5" />
      <Button
        v-for="tool in group"
        :key="tool.label"
        type="button"
        variant="ghost"
        size="icon"
        class="size-8"
        :class="tool.active?.() && 'bg-accent text-accent-foreground'"
        :aria-label="tool.label"
        :title="tool.label"
        :aria-pressed="tool.active ? tool.active() : undefined"
        :disabled="tool.disabled?.()"
        @click="tool.run"
      >
        <component :is="tool.icon" />
      </Button>
    </template>

    <Separator orientation="vertical" class="mx-1 data-[orientation=vertical]:h-5" />
    <DropdownMenu>
      <DropdownMenuTrigger as-child>
        <Button type="button" variant="ghost" size="sm" class="h-8 gap-1 px-2" :class="editor.isActive('callout') && 'bg-accent'">
          <Lightbulb /> Callout <ChevronDown class="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem v-for="c in HELP_CALLOUTS" :key="c.variant" @select="chain().toggleCallout(c.variant).run()">
          {{ c.label }}
          <span v-if="editor.isActive('callout', { variant: c.variant })" class="ml-auto text-xs text-muted-foreground">Remove</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button type="button" variant="ghost" size="sm" class="h-8 gap-1 px-2" :disabled="uploading" @click="fileInput?.click()">
      <ImagePlus /> {{ uploading ? 'Uploading…' : 'Image' }}
    </Button>
    <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="onImage" />

    <div class="ml-auto flex gap-0.5">
      <Button
        v-for="tool in history"
        :key="tool.label"
        type="button"
        variant="ghost"
        size="icon"
        class="size-8"
        :aria-label="tool.label"
        :title="tool.label"
        :disabled="tool.disabled?.()"
        @click="tool.run"
      >
        <component :is="tool.icon" />
      </Button>
    </div>
  </div>
</template>
