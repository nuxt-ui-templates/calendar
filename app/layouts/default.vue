<script setup lang="ts">
const { createEvent, isCommandPaletteOpen } = useCalendar()
</script>

<template>
  <div class="isolate relative flex h-svh overflow-hidden">
    <USidebar
      variant="floating"
      collapsible="none"
      class="p-2"
      :ui="{
        inner: 'bg-white/50 dark:bg-neutral-950/25 backdrop-blur-xl backdrop-saturate-200 rounded-xl divide-none',
        body: 'p-2 pt-0 gap-2',
        footer: 'p-2 border-t border-default'
      }"
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

      <div class="pointer-events-none absolute -inset-e-32 -top-32 -z-10 size-124 rounded-full bg-primary/2.5 blur-3xl" />

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
