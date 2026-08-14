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
  <UCalendar
    v-model="model"
    :week-starts-on="1"
    :year-controls="false"
    size="xs"
    fixed-weeks
    @pointerover="onPointerover"
  />
</template>
