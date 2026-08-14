<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

const { view, date, pathFor, createEvent, editEvent, isCommandPaletteOpen } = useCalendar()
const { events, calendars, hiddenCalendars, toggleCalendar } = useCalendarEvents()

const views = [
  { label: 'Day', value: 'day', icon: 'i-lucide-calendar-range', kbd: 'd' },
  { label: 'Week', value: 'week', icon: 'i-lucide-calendar-days', kbd: 'w' },
  { label: 'Month', value: 'month', icon: 'i-lucide-calendar', kbd: 'm' }
] as const

const groups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [{
  id: 'actions',
  items: [{
    label: 'New event',
    icon: 'i-lucide-plus',
    kbds: ['n'],
    onSelect: () => createEvent()
  }, {
    label: 'Go to today',
    icon: 'i-lucide-calendar-check',
    kbds: ['t'],
    to: pathFor(todayDate())
  }]
}, {
  id: 'views',
  label: 'Views',
  items: views.map(item => ({
    label: item.label,
    icon: item.icon,
    kbds: [item.kbd],
    active: view.value === item.value,
    to: pathFor(date.value, item.value)
  }))
}, {
  id: 'calendars',
  label: 'Calendars',
  // The palette ticks whatever its listbox holds, and that selection is one
  // model shared by every group: `multiple` would tick the actions, the views
  // and the events along with these. They keep it open with `preventDefault`
  // and never reach the model anyway, so the group draws its own mark
  slot: 'calendar',
  items: calendars.value.map(calendar => ({
    label: calendar.name,
    chip: { color: calendar.color },
    checked: !hiddenCalendars.value.includes(calendar.id),
    onSelect: (event: Event) => {
      event.preventDefault()
      toggleCalendar(calendar.id)
    }
  }))
}, {
  // Only the ranges already fetched, the views load more as you navigate
  id: 'events',
  label: 'Events',
  items: events.value.map(event => ({
    label: event.title,
    suffix: formatFullDate(new Date(event.start)),
    chip: { color: calendars.value.find(calendar => calendar.id === event.calendarId)?.color },
    onSelect: () => {
      navigateTo(pathFor(toCalendarDate(new Date(event.start))))
      editEvent(event)
    }
  }))
}])
</script>

<template>
  <UModal
    v-model:open="isCommandPaletteOpen"
    :transition="false"
    :unmount-on-close="false"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #content>
      <UCommandPalette
        :groups="groups"
        placeholder="Search events, switch views..."
        close
        class="h-96"
        @update:model-value="isCommandPaletteOpen = false"
        @update:open="isCommandPaletteOpen = false"
      >
        <!-- Where the palette puts its own selected mark, so a shown calendar
          reads the same as anything it ticks itself -->
        <template #calendar-trailing="{ item, ui }">
          <UIcon
            v-if="item.checked"
            name="i-lucide-check"
            :class="ui.itemTrailingIcon()"
          />
        </template>
      </UCommandPalette>
    </template>
  </UModal>
</template>
