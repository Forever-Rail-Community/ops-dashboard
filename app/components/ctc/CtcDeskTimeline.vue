<script setup lang="ts">
// The Desks page's "Desk changes" as a timeline, newest first: a line down the side with an icon for each change's
// kind (CtcDeskChangeKind), what happened, and when. Times from before today carry the day.
import { ArrowLeftRight, CircleX, LogIn, LogOut, Pencil, Send, ShieldAlert, TimerOff } from '@lucide/vue'
import type { Component } from 'vue'

defineProps<{ changes: CtcDeskChange[] }>()

const KINDS: Record<CtcDeskChangeKind, { icon: Component; tone: string; label: string }> = {
  in: { icon: LogIn, tone: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', label: 'Clocked in' },
  out: { icon: LogOut, tone: 'bg-muted text-muted-foreground', label: 'Clocked out' },
  auto: { icon: TimerOff, tone: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', label: 'Clocked out automatically' },
  transfer: { icon: ArrowLeftRight, tone: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300', label: 'Transfer' },
  takeover: { icon: ShieldAlert, tone: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300', label: 'Staff takeover' },
  request: { icon: Send, tone: 'bg-muted text-muted-foreground', label: 'Transfer request' },
  declined: { icon: CircleX, tone: 'bg-muted text-muted-foreground', label: 'Request declined' },
  edit: { icon: Pencil, tone: 'bg-muted text-muted-foreground', label: 'Desks edited' }
}
// A change remembered from before kinds were recorded counts as an edit.
const kind = (c: CtcDeskChange) => KINDS[c.kind] ?? KINDS.edit

const today = new Date().toDateString()
const when = (iso: string) => {
  const at = new Date(iso)
  const time = at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return at.toDateString() === today ? time : `${at.toLocaleDateString([], { weekday: 'short' })} ${time}`
}
</script>

<template>
  <ol class="relative grid gap-5">
    <li v-for="(c, k) in changes" :key="`${c.at}${k}`" class="relative flex gap-3">
      <span v-if="k < changes.length - 1" class="absolute top-8 bottom-[-1.25rem] left-[0.9375rem] w-px bg-border" aria-hidden="true" />
      <span class="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border" :class="kind(c).tone">
        <component :is="kind(c).icon" class="size-4" aria-hidden="true" />
      </span>
      <div class="grid min-w-0 gap-0.5 pt-1">
        <p class="text-sm leading-snug"><span class="sr-only">{{ kind(c).label }}: </span>{{ c.text }}</p>
        <time :datetime="c.at" class="text-xs text-muted-foreground tabular-nums">{{ when(c.at) }}</time>
      </div>
    </li>
  </ol>
</template>
