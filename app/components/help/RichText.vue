<script setup lang="ts">
// The article body editor. v-model is the document in the editor's JSON format.
import { EditorContent, useEditor, type JSONContent } from '@tiptap/vue-3'

const model = defineModel<HelpDoc>({ required: true })
// HelpDoc is the stored shape; Tiptap's own type for the same JSON is JSONContent.
const asContent = (doc: HelpDoc) => doc as JSONContent

const editor = useEditor({
  content: asContent(model.value),
  extensions: helpEditorExtensions('Write the article. Use the toolbar for headings, lists, images and callouts.'),
  editorProps: { attributes: { class: 'help-prose min-h-80 px-6 py-5 outline-none', 'aria-label': 'Article body' } },
  onUpdate: ({ editor }) => {
    model.value = editor.getJSON() as HelpDoc
  }
})

// When the article is replaced from outside (loaded, or reset after a save conflict), show the new body.
watch(model, (doc) => {
  const e = editor.value
  if (e && JSON.stringify(doc) !== JSON.stringify(e.getJSON())) e.commands.setContent(asContent(doc), { emitUpdate: false })
})
</script>

<template>
  <div class="rounded-lg border bg-card">
    <HelpToolbar v-if="editor" :editor="editor" />
    <EditorContent :editor="editor" />
  </div>
</template>

<style>
/* Article text in the editor. The public help site styles the same elements its own way. */
.help-prose { font-size: 0.95rem; line-height: 1.7; }
.help-prose > * + * { margin-top: 0.75em; }
.help-prose h2 { font-size: 1.35rem; font-weight: 600; line-height: 1.3; margin-top: 1.4em; }
.help-prose h3 { font-size: 1.1rem; font-weight: 600; line-height: 1.35; margin-top: 1.2em; }
.help-prose ul { list-style: disc; padding-left: 1.4em; }
.help-prose ol { list-style: decimal; padding-left: 1.4em; }
.help-prose li > p { margin: 0.2em 0; }
.help-prose a { color: var(--link); text-decoration: underline; text-underline-offset: 2px; }
.help-prose blockquote { border-left: 3px solid var(--border); padding-left: 1em; color: var(--muted-foreground); }
.help-prose hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
.help-prose code { font-size: 0.875em; background: var(--muted); border-radius: 4px; padding: 0.1em 0.35em; }
.help-prose pre { background: var(--muted); border-radius: 8px; padding: 0.8em 1em; overflow-x: auto; }
.help-prose pre code { background: none; padding: 0; }
.help-prose img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--border); }
.help-prose img.ProseMirror-selectednode { outline: 2px solid var(--ring); }
.help-prose table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
.help-prose th, .help-prose td { border: 1px solid var(--border); padding: 0.4em 0.6em; text-align: left; vertical-align: top; }
.help-prose th { background: var(--muted); font-weight: 600; }
.help-prose .selectedCell { background: color-mix(in oklab, var(--primary) 12%, transparent); }
.help-prose div[data-callout] { border: 1px solid; border-radius: 8px; padding: 0.7em 1em; }
.help-prose div[data-callout][data-variant='tip'] {
  border-color: color-mix(in oklab, var(--primary) 35%, transparent);
  background: color-mix(in oklab, var(--primary) 8%, transparent);
}
.help-prose div[data-callout][data-variant='warning'] {
  border-color: color-mix(in oklab, oklch(0.75 0.15 75) 55%, transparent);
  background: color-mix(in oklab, oklch(0.8 0.15 85) 14%, transparent);
}
.help-prose p.is-editor-empty:first-child::before {
  content: attr(data-placeholder); color: var(--muted-foreground); float: left; height: 0; pointer-events: none;
}
</style>
