<script setup lang="ts">
const { calendars, hiddenCalendars, toggleCalendar } = useCalendarEvents()

const items = computed(() => [
  { label: 'Calendars', type: 'label' as const },
  ...calendars.value.map(calendar => ({
    label: calendar.name,
    color: calendar.color,
    value: calendar.id,
    slot: 'calendar' as const,
    // Rendered as a `div` since the link defaults to a `button`, which cannot
    // contain the checkbox
    as: 'div'
  }))
])
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
  >
    <template #calendar="{ item }">
      <UCheckbox
        :label="item.label"
        :color="item.color"
        :model-value="!hiddenCalendars.includes(item.value!)"
        class="w-full"
        @update:model-value="toggleCalendar(item.value!)"
      />
    </template>
  </UNavigationMenu>
</template>
