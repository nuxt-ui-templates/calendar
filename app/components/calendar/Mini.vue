<script setup lang="ts">
import { parseDate, type CalendarDate } from '@internationalized/date'

const { view, date, pathFor } = useCalendar()
const { warmRange } = useCalendarEvents()

const model = computed({
  get: () => date.value,
  set(value: CalendarDate | null | undefined) {
    if (value) {
      navigateTo(pathFor(value))
    }
  }
})

const touchButton = { class: 'max-lg:pointer-coarse:p-2', ui: { leadingIcon: 'max-lg:pointer-coarse:size-5' } }

// Warm the range a click would open while the pointer hovers a day
function onPointerover(event: PointerEvent) {
  const value = (event.target as HTMLElement).closest('[data-value]')?.getAttribute('data-value')
  if (!value) {
    return
  }

  try {
    warmRange(rangeFor(view.value, parseDate(value)))
  } catch {
    // Not a day cell
  }
}
</script>

<template>
  <!-- A size up on a touch screen, below `lg` where it sits in the menu that
    takes the width of the phone -->
  <UCalendar
    v-model="model"
    :week-starts-on="1"
    :year-controls="false"
    size="xs"
    fixed-weeks
    :prev-month="touchButton"
    :next-month="touchButton"
    :ui="{ cell: 'max-lg:pointer-coarse:text-sm', cellTrigger: 'max-lg:pointer-coarse:size-9', headCell: 'max-lg:pointer-coarse:text-xs' }"
    @pointerover="onPointerover"
  />
</template>
