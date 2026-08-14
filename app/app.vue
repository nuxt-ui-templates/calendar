<script setup lang="ts">
// Own the shared events state at the root: its `useFetch` server prefetch
// then completes before the whole tree renders. A mid-tree owner (sidebar
// or page) only gates its own subtree, siblings would render with empty
// events during SSR and mismatch on hydration
useCalendarEvents()

const colorMode = useColorMode()

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt Calendar Template'
const description = 'An Apple Calendar-inspired template built with Nuxt UI, featuring day, week and month views, drag and drop, optimistic updates and keyboard shortcuts.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/calendar-light.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <div class="isolate relative flex h-svh overflow-hidden">
      <AppSidebar />

      <NuxtPage />

      <CalendarEventModal />

      <CommandPalette />
    </div>
  </UApp>
</template>
