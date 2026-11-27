<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ArrowUpRight, BookOpen, Send } from '@lucide/vue'

// Opening a ticket: what it's about, which game, a subject and the details. Help center articles matching the subject
// show beside the form, in case one already answers it. Bugs go to Bug reports instead.
definePageMeta({ title: 'New ticket' })

const { current } = useGame()
const helpUrl = absoluteUrl((useRuntimeConfig().public as { helpUrl: string }).helpUrl)

const form = ref({
  kind: 'support' as TicketKind,
  game: (current.value?.key ?? 'none') as TicketGame,
  subject: '',
  body: ''
})
const busy = ref(false)

// The last page they used before tickets, so staff know where the problem is (shown to staff only).
const fromPage = useLastPage()

async function submit() {
  busy.value = true
  try {
    const ticket = await $fetch<Ticket>('/api/tickets', { method: 'POST', body: { ...form.value, page: fromPage.value } })
    toast.success(`Ticket ${ticketRef(ticket.id)} submitted`, { description: 'Staff will reply here. You’ll find it in My tickets.' })
    await navigateTo(`/tickets?ticket=${ticket.id}`)
  } catch (err: any) {
    toast.error('Not submitted', { description: err?.data?.statusMessage ?? 'Try again.' })
  } finally {
    busy.value = false
  }
}

// Suggestions: published articles whose title or summary share words with the subject.
const { data: help } = useFetch<PublicHelp>('/api/public/help', { key: 'help-suggestions', server: false, immediate: Boolean(helpUrl) })
const suggestions = computed(() => {
  const words = form.value.subject.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2)
  if (!words.length || !help.value) return []
  return help.value.articles
    .map((a) => {
      const text = `${a.title} ${a.summary}`.toLowerCase()
      return { a, score: words.filter((w) => text.includes(w)).length }
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, 3)
    .map(({ a }) => ({ title: a.title, url: `${helpUrl}/${a.categorySlug}/${a.slug}/` }))
})
</script>

<template>
  <PageBody>
    <PageHeader title="New ticket" description="Describe the problem and a staff member will follow up. Only you and staff can see your ticket." />

    <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
      <form class="flex flex-col gap-5 rounded-2xl border bg-card p-6 text-card-foreground" @submit.prevent="submit">
        <fieldset class="grid gap-2.5">
          <legend class="mb-2.5 text-sm font-medium">What can we help with?</legend>
          <div class="grid gap-2.5 sm:grid-cols-3">
            <button
              v-for="k in TICKET_KINDS"
              :key="k.value"
              type="button"
              :aria-pressed="form.kind === k.value"
              class="flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-colors hover:bg-accent"
              :class="form.kind === k.value && 'border-primary ring-1 ring-primary'"
              @click="form.kind = k.value"
            >
              <span class="text-sm font-semibold">{{ k.label }}</span>
              <span class="text-xs text-muted-foreground">{{ k.description }}</span>
            </button>
            <NuxtLink to="/bugs" class="flex flex-col gap-1 rounded-xl border border-dashed p-3.5 transition-colors hover:bg-accent">
              <span class="flex items-center gap-1 text-sm font-semibold">Report a bug<ArrowUpRight class="size-3.5" /></span>
              <span class="text-xs text-muted-foreground">Submit bugs through Bug reports.</span>
            </NuxtLink>
          </div>
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]">
          <div class="grid gap-1.5">
            <Label for="ticket-game">Game</Label>
            <Select v-model="form.game">
              <SelectTrigger id="ticket-game" class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem v-for="g in TICKET_GAMES" :key="g.value" :value="g.value">{{ g.label }}</SelectItem></SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label for="ticket-subject">Subject</Label>
            <Input id="ticket-subject" v-model="form.subject" :maxlength="TICKET_LIMITS.subject" placeholder="Example: Can’t connect to the SE route" />
          </div>
        </div>

        <div class="grid gap-1.5">
          <Label for="ticket-body">Details</Label>
          <Textarea id="ticket-body" v-model="form.body" rows="6" :maxlength="TICKET_LIMITS.body" placeholder="Include what happened, what you expected, and any steps you already tried." />
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button type="submit" :disabled="busy || !form.subject.trim() || !form.body.trim()"><Send />Submit ticket</Button>
          <span class="text-xs text-muted-foreground">Staff are notified right away.</span>
        </div>
      </form>

      <PageSection v-if="helpUrl" :icon="BookOpen" title="Suggested articles" description="These may already answer your question. They update as you type a subject." :count="suggestions.length">
        <PageRow v-for="s in suggestions" :key="s.url" as="a" :href="s.url" target="_blank" rel="noopener" :title="s.title" detail="Opens in the help center">
          <template #trailing><ArrowUpRight class="size-4 text-muted-foreground" /></template>
        </PageRow>
        <template #empty>Type a subject to see matching articles.</template>
      </PageSection>
    </div>
  </PageBody>
</template>
