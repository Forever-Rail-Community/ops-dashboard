<script setup lang="ts">
import type { Component } from 'vue'

// A page's headline figure: an icon, the figure itself (the default slot, beside the icon), what it is,
// and a short detail line underneath.
defineProps<{ icon: Component; label: string }>()
</script>

<template>
  <section :aria-label="label" class="flex flex-col gap-3.5 rounded-2xl border bg-card p-5 text-card-foreground">
    <div class="flex min-h-10 items-center gap-3">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
        <component :is="icon" class="size-[18px]" />
      </span>
      <slot />
    </div>
    <div>
      <div class="text-sm font-semibold">{{ label }}</div>
      <div class="mt-0.5 text-[13px] text-muted-foreground">
        <slot name="detail" />
      </div>
    </div>
  </section>
</template>
