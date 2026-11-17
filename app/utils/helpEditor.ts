import { Node, mergeAttributes, type Extensions } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'

// What a help article can contain. The public help site must render the same nodes, so add a node
// here only together with its rendering there.

export const HELP_CALLOUTS = [
  { variant: 'tip', label: 'Tip' },
  { variant: 'warning', label: 'Warning' }
] as const
export type HelpCallout = (typeof HELP_CALLOUTS)[number]['variant']

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      // Wraps the selection in a callout, changes an existing callout's kind, or removes it if it is already that kind.
      toggleCallout: (variant: HelpCallout) => ReturnType
    }
  }
}

// A highlighted box (tip or warning) around one or more paragraphs.
export const HelpCalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'tip',
        parseHTML: (el) => el.getAttribute('data-variant') ?? 'tip',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant })
      }
    }
  },

  parseHTML: () => [{ tag: 'div[data-callout]' }],
  renderHTML: ({ HTMLAttributes }) => ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '' }), 0],

  addCommands() {
    return {
      toggleCallout:
        (variant) =>
        ({ editor, commands }) => {
          if (!editor.isActive(this.name)) return commands.wrapIn(this.name, { variant })
          if (editor.isActive(this.name, { variant })) return commands.lift(this.name)
          return commands.updateAttributes(this.name, { variant })
        }
    }
  }
})

export function helpEditorExtensions(placeholder: string): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' }
    }),
    Image.configure({ allowBase64: false }),
    TableKit.configure({ table: { resizable: false } }),
    Placeholder.configure({ placeholder }),
    HelpCalloutNode
  ]
}

// An empty article body, in the editor's format.
export const EMPTY_HELP_DOC: HelpDoc = { type: 'doc', content: [{ type: 'paragraph' }] }
