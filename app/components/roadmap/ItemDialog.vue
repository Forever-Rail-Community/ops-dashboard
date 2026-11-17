<script setup lang="ts">
import { toast } from 'vue-sonner'

// Adding or editing a roadmap item (staff).
const props = defineProps<{ item: RoadmapItem | null; status?: RoadmapStatus }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const form = ref({ title: '', description: '', scope: 'dashboard' as RoadmapScope, status: 'planned' as RoadmapStatus })
const announce = ref(true)
const busy = ref(false)
watch(open, (on) => {
  if (!on) return
  const i = props.item
  form.value = i
    ? { title: i.title, description: i.description, scope: i.scope, status: i.status }
    : { title: '', description: '', scope: 'dashboard', status: props.status ?? 'planned' }
})
const moving = computed(() => props.item && props.item.status !== form.value.status)

async function save() {
  busy.value = true
  try {
    if (props.item) await $fetch(`/api/roadmap/items/${props.item.id}`, { method: 'PUT', body: { ...form.value, announce: announce.value } })
    else await $fetch('/api/roadmap/items', { method: 'POST', body: form.value })
    toast.success(props.item ? 'Saved' : 'Added to the roadmap')
    open.value = false
    emit('saved')
  } catch (err) {
    toast.error('Not saved', { description: errorText(err) })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ item ? 'Edit roadmap item' : 'Add to the roadmap' }}</DialogTitle>
      </DialogHeader>
      <div class="grid gap-3">
        <div class="grid gap-1.5"><Label for="item-title">Title</Label><Input id="item-title" v-model="form.title" :maxlength="ROADMAP_LIMITS.title" /></div>
        <div class="grid gap-1.5">
          <Label for="item-description">Description <span class="font-normal text-muted-foreground">(optional)</span></Label>
          <Textarea id="item-description" v-model="form.description" rows="3" :maxlength="ROADMAP_LIMITS.body" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="grid gap-1.5">
            <Label>For</Label>
            <Select v-model="form.scope">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem v-for="s in ROADMAP_SCOPES" :key="s.value" :value="s.value">{{ s.label }}</SelectItem></SelectContent>
            </Select>
          </div>
          <div class="grid gap-1.5">
            <Label>Column</Label>
            <Select v-model="form.status">
              <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem v-for="c in ROADMAP_COLUMNS" :key="c.value" :value="c.value">{{ c.label }}</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <label v-if="moving" class="flex items-center gap-2 text-sm"><Checkbox v-model="announce" />Announce the move on Discord</label>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button :disabled="busy || !form.title.trim()" @click="save">{{ item ? 'Save' : 'Add' }}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
