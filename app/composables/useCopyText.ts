import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'

// Copies text to the clipboard; `copied` stays true for two seconds so a button can say so.
export function useCopyText() {
  const { copy, copied } = useClipboard({ copiedDuring: 2000, legacy: true })
  async function copyText(text: string) {
    try {
      await copy(text)
    } catch {
      toast.error('Not copied', { description: 'Your browser blocked it. Select the text and copy it yourself.' })
    }
  }
  return { copied, copyText }
}
