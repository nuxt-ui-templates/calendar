<script setup lang="ts">
const { createEvent, isCommandPaletteOpen } = useCalendar()
</script>

<template>
  <div class="isolate relative flex h-svh overflow-hidden">
    <USidebar
      variant="floating"
      collapsible="none"
      class="p-2 pe-px"
    >
      <template #header>
        <NuxtLink
          to="/"
          aria-label="Home"
          class="flex items-end gap-0.5 text-highlighted outline-primary/25 focus-visible:outline-3 rounded-md"
        >
          <AppLogo class="h-8 w-auto shrink-0" />
          <span class="text-xl font-bold text-highlighted">Calendar</span>
        </NuxtLink>

        <UTheme :props="{ button: { size: 'sm', class: 'rounded-full' } }">
          <div class="ms-auto flex items-center gap-1.5">
            <UTooltip
              text="Search"
              :kbds="['meta', 'k']"
            >
              <UButton
                icon="i-lucide-search"
                color="neutral"
                variant="outline"
                aria-label="Search"
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
