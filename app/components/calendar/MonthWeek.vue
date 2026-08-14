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

const { pathFor, createEvent } = useCalendar()
const { eventsForDay, eventsForDays, pendingRanges } = useCalendarEvents()

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDays(props.weekStart, index)))
const weekEnd = computed(() => addDays(props.weekStart, 7))

const gridStyle = {
  // The last slot takes the leftover height so the column separators reach
  // the bottom of the row
  gridTemplateRows: ['auto', ...Array.from({ length: MAX_LANES }, () => `${SLOT_HEIGHT}px`), `minmax(${SLOT_HEIGHT}px, 1fr)`].join(' ')
}

const lanes = computed(() => layoutAllDay(eventsForDays(days.value).filter(event => event.allDay), days.value))

const bars = computed(() => lanes.value.filter(bar => bar.lane < MAX_LANES).map(bar => ({
  ...bar,
  continuesBefore: new Date(bar.event.start) < props.weekStart,
  continuesAfter: new Date(bar.event.end) > weekEnd.value
})))

function covers(bar: AllDayPositionedEvent, index: number): boolean {
  return index >= bar.colStart && index < bar.colStart + bar.colSpan
}

// Timed events fill the slots the day's bars leave free, top first, and the
// last free slot becomes the "+N more" button when they overflow
const cells = computed(() => days.value.map((day, index) => {
  const timed = eventsForDay(day)
    .filter(event => !event.allDay)
    .sort((a, b) => a.start.localeCompare(b.start))

  // One pass over the lanes: bars past the last lane never render, they only
  // count towards the overflow
  const covering = lanes.value.filter(bar => covers(bar, index))
  const occupied = new Set(covering.filter(bar => bar.lane < MAX_LANES).map(bar => bar.lane))
  const dropped = covering.filter(bar => bar.lane >= MAX_LANES)

  const free = Array.from({ length: MAX_SLOTS }, (_, slot) => slot).filter(slot => !occupied.has(slot))

  const overflows = dropped.length > 0 || timed.length > free.length
  const visible = timed.slice(0, overflows ? free.length - 1 : free.length)

  return {
    day,
    events: visible.map((event, slot) => ({ event, slot: free[slot]! })),
    // The popover lists the whole day, visible bars included, so the hidden
    // count is carried alongside rather than derived from its length
    more: overflows
      ? { slot: free[visible.length]!, hidden: dropped.length + timed.length - visible.length, events: [...covering.map(bar => bar.event), ...timed] }
      : null
  }
}))

// Placeholder chips while this week's events are in flight, a fixed pattern
// like the week view's so the grid reads as busy without being uniform
const SKELETONS: [number, number][] = [[0, 0], [1, 0], [1, 1], [3, 0], [4, 0], [4, 1], [6, 0]]

// The range test first: it is the cheap one and the false one for almost
// every row
const loading = computed(() => Object.values(pendingRanges.value).some(range => props.weekStart >= range.start && props.weekStart < range.end)
  && !bars.value.length
  && cells.value.every(cell => !cell.events.length && !cell.more))

function label(day: Date): string {
  if (day.getDate() === 1) {
    return `${formatShortMonth(day)} 1`
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

    <!-- A `UButton` here would be the ghost and solid `xs` variants, but the
      month view renders a hundred of these at once and resolving the theme
      that many times is what made switching to it slow. It is a link, so it
      renders as one -->
    <NuxtLink
      v-for="({ day }, index) in cells"
      :key="`number-${day.getTime()}`"
      :to="pathFor(toCalendarDate(day), 'day')"
      class="row-start-1 justify-self-end inline-flex items-center justify-center h-6 min-w-6 m-0.5 px-1 py-1 text-xs font-semibold rounded-full transition-colors focus-visible:outline-3"
      :class="isToday(day)
        ? 'text-inverted bg-primary active:bg-primary/75 outline-primary/25'
        : 'text-default hover:bg-elevated active:bg-elevated outline-inverted/25'"
      :style="{ gridColumn: index + 1 }"
    >
      {{ label(day) }}
    </NuxtLink>

    <USkeleton
      v-for="[day, slot] in loading ? SKELETONS : []"
      :key="`skeleton-${day}-${slot}`"
      class="self-start mx-0.5 h-5 rounded-full"
      :style="{ gridColumn: day + 1, gridRow: slot + 2 }"
    />

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
      <!-- A phone cell has no room for a title and a time, and the title is
        what identifies the event, so the time gives way. The popover keeps
        its own times, it is wide enough -->
      <CalendarEventChip
        v-for="{ event, slot } in dayEvents"
        :key="event.id"
        :event="event"
        show-time
        class="self-start mx-0.5 max-lg:**:data-time:hidden"
        :style="{ gridColumn: index + 1, gridRow: slot + 2 }"
      />

      <UPopover
        v-if="more"
        :ui="{ content: 'flex flex-col gap-0.5 p-2 w-64' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          class="self-start mx-0.5 px-1.5 py-0.5 justify-start text-muted font-normal"
          :style="{ gridColumn: index + 1, gridRow: more.slot + 2 }"
        >
          <span class="lg:hidden">+{{ more.hidden }}</span>
          <span class="hidden lg:inline">+{{ more.hidden }} more</span>
        </UButton>

        <template #content>
          <p class="mb-1 text-sm font-semibold text-center text-highlighted">
            {{ formatFullDate(day) }}
          </p>

          <CalendarEventChip
            v-for="event in more.events"
            :key="event.id"
            :event="event"
            show-time
          />
        </template>
      </UPopover>
    </template>
  </div>
</template>
