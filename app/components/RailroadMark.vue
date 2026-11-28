<script setup lang="ts">
// The railroad theme's reporting mark, faint up the right side of the sidebar (between the menu and the footer).
// Goes first inside <Sidebar>.
// It's placed from the measured letters, not the font's line spacing, so every font sits the same way; every mark has
// the same letter height (see LONGEST_MARK_LENGTH), and it's left out when there isn't room for it.
import '@fontsource/arvo/700.css'
import '@fontsource/jost/700.css'
import '@fontsource/oswald/700.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/archivo-black/400.css'

// Largest letter height; gap from the sidebar's right edge; space kept from the footer and from the menu.
const CAP_PX = 96
const INSET_PX = 16
const FOOTER_GAP_PX = 16
const MENU_GAP_PX = 24

const { theme } = useRailroadTheme()
const svg = useTemplateRef<SVGSVGElement>('svg')
const text = ref<{ size: number; x: number; transform: string } | null>(null)

async function place() {
  const t = theme.value
  const el = svg.value
  const sidebar = el?.parentElement
  text.value = null
  if (!t || !el || !sidebar) return
  const font = `${t.markWeight} 100px ${t.markFont}`
  await document.fonts.load(font, t.mark)
  if (theme.value !== t) return

  const box = el.getBoundingClientRect()
  const groups = sidebar.querySelectorAll('[data-sidebar="group"]')
  const footer = sidebar.querySelector('[data-sidebar="footer"]')
  if (!groups.length || !footer) return
  const menuEnd = groups[groups.length - 1]!.getBoundingClientRect().bottom - box.top
  const start = footer.getBoundingClientRect().top - box.top - FOOTER_GAP_PX
  const cap = Math.min(CAP_PX, (start - menuEnd - MENU_GAP_PX) / LONGEST_MARK_LENGTH)
  if (cap < 12) return // too little room to read

  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.font = font
  const ink = ctx.measureText(t.mark)
  const k = cap / ctx.measureText('H').actualBoundingBoxAscent
  const right = sidebar.getBoundingClientRect().right - box.left
  text.value = {
    size: 100 * k,
    x: ink.actualBoundingBoxLeft * k,
    // Rotated to read upward, so the letters' baseline is a vertical line just inside the right edge.
    transform: `translate(${right - INSET_PX} ${start}) rotate(-90)`
  }
}

// Placed again when the sidebar resizes or its menu changes (pages appear as the game and permissions load).
let frame = 0
let resized: ResizeObserver | undefined
let changed: MutationObserver | undefined
const placeSoon = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(place)
}
onMounted(() => {
  const sidebar = svg.value?.parentElement
  const menu = sidebar?.querySelector('[data-sidebar="content"]')
  resized = new ResizeObserver(placeSoon)
  changed = new MutationObserver(placeSoon)
  if (sidebar) resized.observe(sidebar)
  if (menu) changed.observe(menu, { childList: true, subtree: true })
  watch(theme, placeSoon, { immediate: true })
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resized?.disconnect()
  changed?.disconnect()
})
</script>

<template>
  <svg ref="svg" class="pointer-events-none absolute inset-0 size-full overflow-hidden select-none group-data-[collapsible=icon]:hidden" aria-hidden="true">
    <text
      v-if="theme && text"
      :font-family="theme.markFont"
      :font-weight="theme.markWeight"
      :font-size="text.size.toFixed(2)"
      :x="text.x.toFixed(2)"
      :transform="text.transform"
      class="fill-sidebar-foreground opacity-[.07]"
    >{{ theme.mark }}</text>
  </svg>
</template>
