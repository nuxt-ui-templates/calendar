<script setup lang="ts">
const { calendars, hiddenCalendars, toggleCalendar } = useCalendarEvents()
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <p class="px-1.5 text-xs font-semibold text-muted">
      Calendars
    </p>

    <UCheckbox
      v-for="calendar in calendars"
      :key="calendar.id"
      :label="calendar.name"
      :color="calendar.color"
      :model-value="!hiddenCalendars.includes(calendar.id)"
      class="px-1.5 py-0.5"
      @update:model-value="toggleCalendar(calendar.id)"
    />
  </div>
</template>
