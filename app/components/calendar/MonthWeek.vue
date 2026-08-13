<script setup lang="ts">
import { addDays, addMinutes, isToday, startOfDay } from 'date-fns'

// A week is one grid: the day numbers, then a fixed stack of slots each day
// fills on its own. All-day bars span columns and hold their lane across the
// days they cover, the other days keep those slots for their own events
const SLOT_HEIGHT = 22
const MAX_SLOTS = 4
// Bars never take the last slot, so a day always has room for an event or
// the "+N more" button
const MAX_LANES = MAX_SLOTS - 1

const props = defineProps<{
  weekStart: Date
}>()

const { pathFor, createEvent, visibleMonth } = useCalendar()
const { events } = useCalendarEvents()

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDays(props.weekStart, index)))
const weekEnd = computed(() => addDays(props.weekStart, 7))

const gridStyle = {
  // The last slot takes the leftover height so the column separators reach
  // the bottom of the row
  gridTemplateRows: ['auto', ...Array.from({ length: MAX_LANES }, () => `${SLOT_HEIGHT}px`), `minmax(${SLOT_HEIGHT}px, 1fr)`].join(' ')
}

const lanes = computed(() => layoutAllDay(events.value.filter(event => event.allDay), days.value))

const bars = computed(() => lanes.value.filter(bar => bar.lane < MAX_LANES).map(bar => ({
  ...bar,
  continuesBefore: new Date(bar.event.start) < props.weekStart,
  continuesAfter: new Date(bar.event.end) > weekEnd.value
})))

function covers(bar: AllDayPositionedEvent, index: number): boolean {
  return index >= bar.colStart && index < bar.colStart + bar.colSpan
}

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

// Timed events fill the slots the day's bars leave free, top first, and the
// last free slot becomes the "+N more" button when they overflow
const cells = computed(() => days.value.map((day, index) => {
  const timed = events.value
    .filter(event => !event.allDay && overlapsDay(event, day))
    .sort((a, b) => a.start.localeCompare(b.start))

  const occupied = new Set(bars.value.filter(bar => covers(bar, index)).map(bar => bar.lane))
  const free = Array.from({ length: MAX_SLOTS }, (_, slot) => slot).filter(slot => !occupied.has(slot))

  // All-day events past the last lane never render, they only count towards
  // the overflow
  const dropped = lanes.value.filter(bar => bar.lane >= MAX_LANES && covers(bar, index)).map(bar => bar.event)

  const overflows = dropped.length > 0 || timed.length > free.length
  const visible = timed.slice(0, overflows ? free.length - 1 : free.length)

  return {
    day,
    events: visible.map((event, slot) => ({ event, slot: free[slot]! })),
    more: overflows
      ? { slot: free[visible.length]!, events: [...dropped, ...timed] }
      : null
  }
}))

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
      class="row-start-1 justify-self-end flex items-center justify-center h-6 min-w-6 m-0.5 px-1 text-xs font-semibold rounded-full hover:bg-elevated"
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
      class="self-start mx-0.5"
      :class="[continuesBefore && 'rounded-s-none', continuesAfter && 'rounded-e-none']"
      :style="{ gridColumn: `${colStart + 1} / span ${colSpan}`, gridRow: lane + 2 }"
    />

    <template
      v-for="({ day, events: dayEvents, more }, index) in cells"
      :key="`events-${day.getTime()}`"
    >
      <CalendarEventChip
        v-for="{ event, slot } in dayEvents"
        :key="event.id"
        :event="event"
        show-time
        class="self-start mx-0.5"
        :style="{ gridColumn: index + 1, gridRow: slot + 2 }"
      />

      <UPopover v-if="more">
        <button
          type="button"
          class="self-start mx-0.5 px-1.5 text-xs text-start text-muted hover:text-highlighted cursor-pointer"
          :style="{ gridColumn: index + 1, gridRow: more.slot + 2 }"
        >
          +{{ more.events.length - dayEvents.length }} more
        </button>

        <template #content>
          <div class="flex flex-col gap-0.5 p-2 w-64">
            <p class="mb-1 text-sm font-semibold text-center text-highlighted">
              {{ formatFullDate(day) }}
            </p>

            <CalendarEventChip
              v-for="event in more.events"
              :key="event.id"
              :event="event"
              show-time
            />
          </div>
        </template>
      </UPopover>
    </template>
  </div>
</template>
