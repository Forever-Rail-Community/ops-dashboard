<script setup lang="ts">
import { Bug, LayoutGrid, Lightbulb, Search } from '@lucide/vue'

// The row under the top bar: which part of the Operations Center to show, bug fixes only, search, and suggesting.
defineProps<{ searchLabel: string }>()
const { scope, bugFixesOnly, query } = useRoadmapFilters()
const chips = computed(() => [{ value: 'all' as const, label: 'All', icon: LayoutGrid }, ...ROADMAP_SCOPES.map((s) => ({ ...s, icon: SCOPE_ICON[s.value] }))])
const chip = 'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium whitespace-nowrap'
const on = 'border-border bg-muted text-foreground'
const off = 'border-transparent text-muted-foreground hover:text-foreground'
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="-mx-1 flex max-w-full items-center gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:flex-wrap" role="group" aria-label="Show">
      <button
        v-for="c in chips" :key="c.value" type="button" :class="[chip, scope === c.value ? on : off]"
        :aria-pressed="scope === c.value" @click="scope = c.value"
      >
        <component :is="c.icon" class="size-[15px]" />{{ c.label }}
      </button>
      <span aria-hidden="true" class="mx-1 h-5 w-px shrink-0 bg-border" />
      <button type="button" :class="[chip, bugFixesOnly ? on : off]" :aria-pressed="bugFixesOnly" @click="bugFixesOnly = !bugFixesOnly">
        <Bug class="size-[15px]" />Bug fixes
      </button>
    </div>
    <div class="flex w-full gap-2 md:ml-auto md:w-auto">
      <div class="relative min-w-0 flex-1 md:w-56 md:flex-none">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input v-model="query" class="pl-9" :placeholder="searchLabel" :aria-label="searchLabel" />
      </div>
      <Button as-child><NuxtLink to="/roadmap/requests#suggest"><Lightbulb />Suggest a feature</NuxtLink></Button>
    </div>
  </div>
</template>
