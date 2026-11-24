<script setup lang="ts">
import { ChevronUp } from '@lucide/vue'

// One vote per person per request. "pill" is the small one on roadmap cards, "box" the tall one in the request list.
const props = withDefaults(defineProps<{ votes: number; voted: boolean; title: string; disabled?: boolean; size?: 'pill' | 'box' }>(), {
  disabled: false,
  size: 'pill'
})
const emit = defineEmits<{ toggle: [] }>()
const label = computed(() => `${props.voted ? 'Take back your vote for' : 'Vote for'} ${props.title}, ${props.votes} ${props.votes === 1 ? 'vote' : 'votes'}`)
</script>

<template>
  <button
    type="button"
    class="flex shrink-0 items-center justify-center border font-semibold tabular-nums transition-colors disabled:opacity-60"
    :class="[
      size === 'pill' ? 'h-7 gap-1 rounded-lg px-2.5 text-[13px]' : 'h-14 w-[52px] flex-col rounded-[10px] text-[15px]',
      voted ? 'border-sky-500/45 bg-sky-500/15 text-sky-700 dark:text-sky-200' : 'bg-background hover:bg-accent'
    ]"
    :disabled="disabled"
    :aria-pressed="voted"
    :aria-label="label"
    @click.stop="emit('toggle')"
  >
    <ChevronUp class="size-3.5" />{{ votes }}
  </button>
</template>
