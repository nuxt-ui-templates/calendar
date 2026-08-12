<template>
  <div class="flex h-svh overflow-hidden">
    <USidebar
      variant="floating"
      collapsible="none"
      class="p-2"
      :ui="{
        inner: 'bg-elevated/25',
        header: 'px-4',
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
          <AppLogo class="w-auto h-6 shrink-0" />
        </NuxtLink>
      </template>

      <CalendarList />

      <CalendarMiniCalendar class="mt-auto" />

      <template #footer>
        <UserMenu />
      </template>
    </USidebar>

    <slot />

    <CalendarEventModal />
  </div>
</template>
