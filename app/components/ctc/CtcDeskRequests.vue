<script setup lang="ts">
// Mounted once for the whole site (app.vue): the pop-up for a request or takeover of your desk, wherever you are in
// the Operations Center. Showing it tells the server it was seen, which a staff takeover waits for.
const { incoming, busy, answer, seen } = useDeskRequests({ poll: true })
watch(() => incoming.value && `${incoming.value.deskId}${incoming.value.at}`, (key) => { if (key) seen(incoming.value!.deskId) }, { immediate: true })
</script>

<template>
  <CtcDeskRequestPrompt
    v-if="incoming" :key="`${incoming.deskId}${incoming.at}`" :request="incoming" :busy="busy"
    @give="answer(incoming.deskId, true)" @keep="answer(incoming.deskId, false)"
  />
</template>
