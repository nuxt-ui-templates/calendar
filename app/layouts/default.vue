<script setup lang="ts">
const { createEvent, isCommandPaletteOpen } = useCalendar()
</script>

<template>
  <div class="flex h-svh overflow-hidden">
    <USidebar
      variant="floating"
      collapsible="none"
      class="p-2"
      :ui="{
        inner: 'bg-elevated/25',
        header: 'px-2',
        body: 'p-2 gap-4',
        footer: 'p-2'
      }"
    >
      <template #header>
        <NuxtLink
          to="/"
          aria-label="Home"
          class="flex items-end gap-0.5 text-highlighted"
        >
          <AppLogo class="h-8 w-auto shrink-0" />
          <span class="text-xl font-bold text-highlighted">Calendar</span>
        </NuxtLink>

        <div class="ms-auto flex items-center gap-1">
          <UTooltip
            text="Search"
            :kbds="['meta', 'k']"
          >
            <UButton
              icon="i-lucide-search"
              color="neutral"
              variant="soft"
              aria-label="Search"
              size="sm"
              class="rounded-full"
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
              size="sm"
              class="rounded-full"
              @click="createEvent()"
            />
          </UTooltip>
        </div>
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
