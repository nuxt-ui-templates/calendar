<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

// error.vue replaces app.vue entirely, so it owns the shared events state
// here for the same reason: the sidebar (calendar list, mini calendar) and
// command palette read from it
useCalendarEvents()

const notFound = computed(() => props.error.statusCode === 404)

useSeoMeta({
  title: () => notFound.value ? 'Page not found' : 'Something went wrong',
  description: () => notFound.value
    ? 'We are sorry but this page could not be found.'
    : 'We are sorry but an unexpected error occurred.'
})

useHead({
  htmlAttrs: {
    lang: 'en'
  }
})
</script>

<template>
  <UApp>
    <div class="isolate relative flex h-svh overflow-hidden">
      <AppSidebar />

      <UError
        :error="error"
        class="flex-1"
      />

      <AppSearch />
    </div>
  </UApp>
</template>
