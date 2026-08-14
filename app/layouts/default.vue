<script setup lang="ts">
const { createEvent, isCommandPaletteOpen, isEventModalOpen, isSidebarOpen } = useCalendar()

const route = useRoute()

// Same query the sidebar switches on. Closing is only right below it: above,
// the model drives the desktop collapse instead
const isMobile = useMediaQuery('(max-width: 1023px)')

// Everything the menu offers takes over the screen on a phone, so it steps
// out of the way once one of them is on its way in
watch([() => route.fullPath, isEventModalOpen, isCommandPaletteOpen], () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
})
</script>

<template>
  <div class="isolate relative flex h-svh overflow-hidden">
    <!-- Below `lg` the sidebar becomes a slideover the header opens, inset and
      cut from the same glass so it reads as the floating one sliding in rather
      than a sheet of its own. The collapsible variants leave the root to the
      gap that reserves the width, so the padding belongs to the fixed
      container, and it drops the border they hand it there: the sidebar is
      framed by its own ring, `pe-px` is the whole gap to the page -->
    <USidebar
      v-model:open="isSidebarOpen"
      variant="floating"
      :menu="{ inset: true, ui: { content: 'max-w-xs' } }"
      :ui="{ container: 'p-2 pe-px border-0' }"
    >
      <template #header="{ close }">
        <NuxtLink
          to="/"
          aria-label="Home"
          class="flex items-end gap-0.5 text-highlighted outline-primary/25 focus-visible:outline-3 rounded-md"
        >
          <AppLogo class="h-8 w-auto shrink-0" />
          <span class="text-xl font-bold text-highlighted">Calendar</span>
        </NuxtLink>

        <UTheme :props="{ button: { size: 'sm', class: 'rounded-full!' } }">
          <div class="ms-auto flex items-center gap-1.5">
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="outline"
              aria-label="Close menu"
              class="lg:hidden rounded-full"
              @click="close"
            />

            <UTooltip
              text="Search"
              :kbds="['meta', 'k']"
            >
              <UButton
                icon="i-lucide-search"
                color="neutral"
                variant="soft"
                aria-label="Search"
                class="hidden lg:inline-flex rounded-full"
                @click="isCommandPaletteOpen = true"
              />
            </UTooltip>

            <UTooltip
              text="New event"
              :kbds="['n']"
            >
              <UButton
                icon="i-lucide-plus"
                aria-label="New event"
                @click="createEvent()"
              />
            </UTooltip>
          </div>
        </UTheme>
      </template>

      <UButton
        icon="i-lucide-search"
        color="neutral"
        variant="soft"
        label="Search"
        class="mt-2 lg:hidden"
        @click="isCommandPaletteOpen = true"
      />

      <CalendarList />

      <USeparator class="mt-auto" />

      <CalendarMiniCalendar />

      <template #footer>
        <UserMenu />
      </template>
    </USidebar>

    <slot />

    <CalendarEventModal />

    <CommandPalette />
  </div>
</template>
