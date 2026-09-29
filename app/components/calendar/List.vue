<script setup lang="ts">
import { calendarDotClasses } from '~/utils/calendars'
import { calendarLayerColors } from '~/utils/calendar-colors'

const { calendars, hiddenCalendars, toggleCalendar, setCalendarColor } = useCalendarEvents()

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

// Only one color picker is open at a time: it closes right after a pick so it
// never covers the layers below
const openColorFor = ref<string | null>(null)

function colorFor(id: string) {
  return calendars.value.find(calendar => calendar.id === id)
}

function pickColor(id: string, color: Calendar['color']) {
  setCalendarColor(id, color)
  openColorFor.value = null
}
</script>

<template>
  <UNavigationMenu
    :items="items"
    orientation="vertical"
  >
    <template #calendar="{ item }">
      <div class="flex w-full items-center gap-1">
        <UCheckbox
          :label="item.label"
          :color="colorFor(item.value!)?.color"
          :model-value="!hiddenCalendars.includes(item.value!)"
          class="min-w-0 flex-1"
          @update:model-value="toggleCalendar(item.value!)"
        />
        <UPopover
          :open="openColorFor === item.value"
          :ui="{ content: 'p-1.5' }"
          @update:open="open => openColorFor = open ? item.value! : null"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            square
            :aria-label="`Change ${item.label} color`"
          >
            <span :class="['inline-block size-3 rounded-full', calendarDotClasses[colorFor(item.value!)?.color ?? 'primary']]" />
          </UButton>

          <template #content>
            <div class="flex items-center gap-0.5">
              <UButton
                v-for="color in calendarLayerColors"
                :key="color"
                variant="ghost"
                color="neutral"
                size="xs"
                square
                :aria-label="color"
                @click="pickColor(item.value!, color)"
              >
                <span :class="['inline-block size-3.5 rounded-full', calendarDotClasses[color], colorFor(item.value!)?.color === color ? 'ring-2 ring-neutral-500 ring-offset-1' : 'opacity-40']" />
              </UButton>
            </div>
          </template>
        </UPopover>
      </div>
    </template>
  </UNavigationMenu>
</template>
