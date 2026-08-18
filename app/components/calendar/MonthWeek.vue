<script setup lang="ts">
import { addDays, isSameDay, isToday } from 'date-fns'

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

const { pathFor } = useCalendar()
const { eventsForDay, eventsForDays, pendingRanges } = useCalendarEvents()
const { draftEvent, onGridPointerdown, onGridDblclick } = useEventDraft()

const days = computed(() => Array.from({ length: 7 }, (_, index) => addDays(props.weekStart, index)))
const weekEnd = computed(() => addDays(props.weekStart, 7))

const gridStyle = {
  // The last slot takes the leftover height so the column separators reach
  // the bottom of the row
  gridTemplateRows: ['auto', ...Array.from({ length: MAX_LANES }, () => `${SLOT_HEIGHT}px`), `minmax(${SLOT_HEIGHT}px, 1fr)`].join(' ')
}

const lanes = computed(() => layoutAllDay(
  [
    ...eventsForDays(days.value).filter(event => event.allDay),
    ...(draftEvent.value?.allDay ? [draftEvent.value] : [])
  ],
  days.value
))

// The draft is the one bar that is never cut: it is what the pointer is on,
// so past the last lane it takes that lane instead of disappearing
const placed = computed(() => lanes.value.map(bar => bar.event.id === DRAFT_EVENT_ID
  ? { ...bar, lane: Math.min(bar.lane, MAX_LANES - 1) }
  : bar))

const bars = computed(() => placed.value.filter(bar => bar.lane < MAX_LANES).map(bar => ({
  ...bar,
  continuesBefore: new Date(bar.event.start) < props.weekStart,
  continuesAfter: new Date(bar.event.end) > weekEnd.value
})))

function covers(bar: AllDayPositionedEvent, index: number): boolean {
  return index >= bar.colStart && index < bar.colStart + bar.colSpan
}

// Timed events fill the slots the day's bars leave free, top first, and the
// last free slot becomes the "+N more" button when they overflow
const cells = computed(() => {
  const drafted = draftEvent.value && !draftEvent.value.allDay ? draftEvent.value : null

  return days.value.map((day, index) => {
    const timed = [
      ...eventsForDay(day).filter(event => !event.allDay),
      ...(drafted && isSameDay(new Date(drafted.start), day) ? [drafted] : [])
    ].sort((a, b) => a.start.localeCompare(b.start))

    // One pass over the lanes: bars past the last lane never render, they only
    // count towards the overflow
    const covering = placed.value.filter(bar => covers(bar, index))
    const occupied = new Set(covering.filter(bar => bar.lane < MAX_LANES).map(bar => bar.lane))
    const dropped = covering.filter(bar => bar.lane >= MAX_LANES)

    const free = Array.from({ length: MAX_SLOTS }, (_, slot) => slot).filter(slot => !occupied.has(slot))

    const overflows = dropped.length > 0 || timed.length > free.length
    let visible = timed.slice(0, overflows ? Math.max(free.length - 1, 0) : free.length)

    // Same again for a timed draft: it takes the last visible slot rather
    // than hiding behind the button, which would leave nothing to draw on
    if (drafted && timed.includes(drafted) && !visible.includes(drafted)) {
      visible = [...visible.slice(0, -1), drafted]
    }

    const slot = free[visible.length]

    return {
      day,
      events: visible.map((event, position) => ({ event, slot: free[position]! })),
      // The popover lists the whole day, visible bars included, so the hidden
      // count is carried alongside rather than derived from its length. The
      // draft is left out of it, it is not an event yet
      more: overflows && slot !== undefined
        ? {
            slot,
            hidden: dropped.length + timed.length - visible.length,
            events: [...covering.map(bar => bar.event), ...timed].filter(event => event.id !== DRAFT_EVENT_ID)
          }
        : null
    }
  })
})

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
</script>

<template>
  <div
    class="grid grid-cols-7 min-w-0 border-b border-default"
    :style="gridStyle"
  >
    <!-- Column separators, behind everything so a gesture on empty space
      anywhere in the day lands here. They carry the day a drag reads back off
      them, which is what lets it run into the rows below -->
    <div
      v-for="({ day }, index) in cells"
      :key="`day-${day.getTime()}`"
      :data-date="isoDate(day)"
      class="row-span-full border-default"
      :class="index !== 0 && 'border-s'"
      :style="{ gridColumn: index + 1 }"
      @pointerdown="onGridPointerdown($event, { kind: 'month', day })"
      @dblclick="onGridDblclick($event, { kind: 'month', day })"
    />

    <!-- A `UButton` here would be the ghost and solid `xs` variants, but the
      month view renders a hundred of these at once and resolving the theme
      that many times is what made switching to it slow. It is a link, so it
      renders as one -->
    <NuxtLink
      v-for="({ day }, index) in cells"
      :key="`number-${day.getTime()}`"
      :to="pathFor(toCalendarDate(day), 'day')"
      class="select-none row-start-1 justify-self-end inline-flex items-center justify-center h-6 min-w-6 m-0.5 px-1 py-1 text-xs font-semibold rounded-full transition-colors focus-visible:outline-3"
      :class="isToday(day)
        ? 'text-inverted bg-primary active:bg-primary/75 outline-primary/25'
        : 'text-default hover:bg-(--control-bg) active:bg-(--control-bg) outline-inverted/25'"
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

    <template
      v-for="{ event, colStart, colSpan, lane, continuesBefore, continuesAfter } in bars"
      :key="event.id"
    >
      <!-- A draft spanning two rows draws in both, and the one holding its
        start is the one the form hangs off -->
      <CalendarEventDraft
        v-if="event.id === DRAFT_EVENT_ID"
        variant="chip"
        :anchored="!continuesBefore"
        :continues-before="continuesBefore"
        :continues-after="continuesAfter"
        class="self-start mx-0.5"
        :style="{ gridColumn: `${colStart + 1} / span ${colSpan}`, gridRow: lane + 2 }"
      />
      <CalendarEventChip
        v-else
        :event="event"
        class="self-start mx-0.5"
        :class="[continuesBefore && 'rounded-s-none', continuesAfter && 'rounded-e-none']"
        :style="{ gridColumn: `${colStart + 1} / span ${colSpan}`, gridRow: lane + 2 }"
      />
    </template>

    <template
      v-for="({ day, events: dayEvents, more }, index) in cells"
      :key="`events-${day.getTime()}`"
    >
      <!-- A phone cell has no room for a title and a time, and the title is
        what identifies the event, so the time gives way. The popover keeps
        its own times, it is wide enough -->
      <template
        v-for="{ event, slot } in dayEvents"
        :key="event.id"
      >
        <CalendarEventDraft
          v-if="event.id === DRAFT_EVENT_ID"
          variant="chip"
          anchored
          class="self-start mx-0.5"
          :style="{ gridColumn: index + 1, gridRow: slot + 2 }"
        />
        <CalendarEventChip
          v-else
          :event="event"
          show-time
          class="self-start mx-0.5 max-lg:**:data-time:hidden"
          :style="{ gridColumn: index + 1, gridRow: slot + 2 }"
        />
      </template>

      <UPopover
        v-if="more"
        :content="{ side: 'right' }"
        :ui="{ content: 'flex flex-col gap-0.5 p-2 w-64' }"
      >
        <!-- Held open reads as held down, the same as the chips around it -->
        <template #default="{ open }">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            class="self-start mx-0.5 px-1.5 py-0.5 justify-start text-muted font-normal"
            :class="open && 'bg-elevated'"
            :style="{ gridColumn: index + 1, gridRow: more.slot + 2 }"
          >
            <span class="lg:hidden">+{{ more.hidden }}</span>
            <span class="hidden lg:inline">+{{ more.hidden }} more</span>
          </UButton>
        </template>

        <template #content>
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
