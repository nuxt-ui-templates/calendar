<script setup lang="ts">
import { addDays, addMinutes, isToday, startOfDay } from 'date-fns'

const MAX_VISIBLE = 3

const props = defineProps<{
  weekStart: Date
}>()

const { pathFor, createEvent, visibleMonth } = useCalendar()
const { events } = useCalendarEvents()

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDays(props.weekStart, index)))
const weekEnd = computed(() => addDays(props.weekStart, 7))

const bars = computed(() => layoutAllDay(events.value.filter(event => event.allDay), days.value).map(bar => ({
  ...bar,
  continuesBefore: new Date(bar.event.start) < props.weekStart,
  continuesAfter: new Date(bar.event.end) > weekEnd.value
})))

// All-day bars span days, so the week is a single grid: the day numbers,
// then a row per bar lane, then the timed events
const laneCount = computed(() => bars.value.reduce((count, bar) => Math.max(count, bar.lane + 1), 0))

const gridStyle = computed(() => ({
  // Listed out rather than `repeat()`, which is invalid for zero lanes
  gridTemplateRows: ['auto', ...Array.from({ length: laneCount.value }, () => 'auto'), 'minmax(0, 1fr)'].join(' ')
}))

// The month view overlays its big month label on the week containing the
// 1st, where it covers the first day number until the month docks into the
// header and leaves the spot free again
const monthStart = computed(() => days.value.find(day => day.getDate() === 1))

const labelRides = computed(() => {
  const start = monthStart.value

  if (!start) {
    return false
  }

  return !visibleMonth.value
    || visibleMonth.value.year !== start.getFullYear()
    || visibleMonth.value.month !== start.getMonth() + 1
})

const cells = computed(() => days.value.map(day => ({
  day,
  events: events.value
    .filter(event => !event.allDay && overlapsDay(event, day))
    .sort((a, b) => a.start.localeCompare(b.start))
})))

function label(day: Date): string {
  if (day.getDate() === 1) {
    return `${new Intl.DateTimeFormat('en-US', { month: 'short' }).format(day)} 1`
  }

  return String(day.getDate())
}

// Clicking an empty cell creates a one-hour event at 09:00 that day
function onCellClick(day: Date) {
  const start = addMinutes(startOfDay(day), 9 * 60)

  createEvent({ start, end: addMinutes(start, 60) })
}
</script>

<template>
  <div
    class="grid grid-cols-7 min-w-0 border-b border-default"
    :style="gridStyle"
  >
    <!-- Column separators, behind everything so a click on empty space
      anywhere in the day lands here -->
    <div
      v-for="({ day }, index) in cells"
      :key="`day-${day.getTime()}`"
      class="row-span-full border-default"
      :class="index !== 0 && 'border-s'"
      :style="{ gridColumn: index + 1 }"
      @click="onCellClick(day)"
    />

    <NuxtLink
      v-for="({ day }, index) in cells"
      :key="`number-${day.getTime()}`"
      :to="pathFor(toCalendarDate(day), 'day')"
      class="row-start-1 justify-self-end flex items-center justify-center h-6 min-w-6 mt-0.5 me-0.5 px-1 text-xs font-semibold rounded-full hover:bg-elevated"
      :class="[
        isToday(day) ? 'bg-primary text-inverted hover:bg-primary' : 'text-default',
        labelRides && index === 0 && 'invisible'
      ]"
      :style="{ gridColumn: index + 1 }"
    >
      {{ label(day) }}
    </NuxtLink>

    <CalendarEventChip
      v-for="{ event, colStart, colSpan, lane, continuesBefore, continuesAfter } in bars"
      :key="event.id"
      :event="event"
      class="mx-1 mb-1"
      :class="[continuesBefore && 'rounded-s-none', continuesAfter && 'rounded-e-none']"
      :style="{ gridColumn: `${colStart + 1} / span ${colSpan}`, gridRow: lane + 2 }"
    />

    <!-- Transparent to clicks so empty space still creates an event -->
    <div
      v-for="({ day, events: dayEvents }, index) in cells"
      :key="`events-${day.getTime()}`"
      class="flex flex-col gap-0.5 px-1 pb-1 min-w-0 overflow-hidden pointer-events-none"
      :style="{ gridColumn: index + 1, gridRow: laneCount + 2 }"
    >
      <CalendarEventChip
        v-for="event in dayEvents.slice(0, MAX_VISIBLE)"
        :key="event.id"
        :event="event"
        show-time
        class="pointer-events-auto"
      />

      <UPopover v-if="dayEvents.length > MAX_VISIBLE">
        <button
          type="button"
          class="px-1.5 text-xs text-start text-muted hover:text-highlighted cursor-pointer pointer-events-auto"
        >
          +{{ dayEvents.length - MAX_VISIBLE }} more
        </button>

        <template #content>
          <div class="flex flex-col gap-0.5 p-2 w-64">
            <p class="mb-1 text-sm font-semibold text-center text-highlighted">
              {{ formatFullDate(day) }}
            </p>

            <CalendarEventChip
              v-for="event in dayEvents"
              :key="event.id"
              :event="event"
              show-time
            />
          </div>
        </template>
      </UPopover>
    </div>
  </div>
</template>
