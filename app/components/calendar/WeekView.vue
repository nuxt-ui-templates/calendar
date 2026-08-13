<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import { differenceInCalendarDays, isToday } from 'date-fns'

const { date, range } = useCalendar()
const { eventsForDay, eventsForDays, status } = useCalendarEvents()

const isSmallScreen = useBreakpoints(breakpointsTailwind).smaller('lg')
// Only narrow after mount: the server always renders the full week, so the
// hydrated DOM must match it
const mounted = useMounted()

// Small screens show a 3-day window around the anchor date, clamped so it
// stays inside the fetched week
const days = computed(() => {
  const week = eachDay(range.value)
  if (week.length <= 3 || !mounted.value || !isSmallScreen.value) {
    return week
  }

  const start = Math.min(Math.max(differenceInCalendarDays(toDate(date.value), range.value.start), 0), week.length - 3)

  return week.slice(start, start + 3)
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `3.5rem repeat(${days.value.length}, minmax(0, 1fr))`
}))

const timedEvents = computed(() => days.value.map(day => layoutDay(
  eventsForDay(day).filter(event => !event.allDay),
  day
)))

const allDayEvents = computed(() => layoutAllDay(
  eventsForDays(days.value).filter(event => event.allDay),
  days.value
))

// A pending fetch keeps serving the previous range, so the placeholders wait
// until the visible days have nothing of their own to show
const loading = computed(() => status.value === 'pending'
  && !allDayEvents.value.length
  && timedEvents.value.every(day => !day.length))

const hours = Array.from({ length: 23 }, (_, index) => index + 1)

// The day header rides over the scroller, so the grid has to pad itself by
// the header band plus the header's own height. Only the all-day row varies,
// the day names are the fixed height the month view mirrors (plus its border)
const DAY_HEADER_HEIGHT = 41

const chrome = useTemplateRef('chrome')
const { height: chromeHeight } = useElementSize(chrome, { width: 0, height: DAY_HEADER_HEIGHT }, { box: 'border-box' })

const container = useTemplateRef('container')

onMounted(() => {
  container.value?.$el.scrollTo({ top: 7 * HOUR_HEIGHT })
})
</script>

<template>
  <div class="relative flex-1 flex flex-col min-h-0">
    <!-- Starts at the page top, the grid padding leaves the chrome band free
      so events scroll behind the blur. `z-0` keeps a dragged event under the
      floating header the way `isolate` did, without turning this into a
      backdrop root -->
    <UScrollArea
      ref="container"
      class="flex-1 z-0 [view-transition-name:calendar]"
    >
      <div
        data-week-grid
        class="grid"
        :style="{ ...gridStyle, paddingTop: `calc(var(--ui-header-height) + 0.5rem + ${chromeHeight}px)` }"
      >
        <div
          class="relative"
          :style="{ height: `${24 * HOUR_HEIGHT}px` }"
        >
          <span
            v-for="hour in hours"
            :key="hour"
            class="absolute end-2 -translate-y-1/2 text-[11px] text-dimmed tabular-nums"
            :style="{ top: `${hour * HOUR_HEIGHT}px` }"
          >
            {{ formatHour(hour) }}
          </span>
        </div>

        <CalendarDayColumn
          v-for="(day, index) in days"
          :key="day.getTime()"
          :day="day"
          :events="timedEvents[index]!"
          :loading="loading"
        />
      </div>
    </UScrollArea>

    <!-- Outside the scroller like the month view's weekday bar: sitting
      inside it, the scroll area (a backdrop root, it carries a view
      transition name) would be all the blur has to sample. Named for the
      same reason as the header, so it stays above the grid snapshot during a
      view transition and keeps blurring it -->
    <div
      ref="chrome"
      class="absolute top-[calc(var(--ui-header-height)+0.5rem)] inset-x-0 z-30 bg-default/50 backdrop-blur border-b border-default [view-transition-name:weekdays]"
    >
      <div
        class="grid"
        :style="gridStyle"
      >
        <div />

        <div
          v-for="day in days"
          :key="day.getTime()"
          class="flex items-center justify-center gap-1 py-2 text-sm border-s border-default"
        >
          <span class="text-muted">
            {{ formatWeekday(day) }}
          </span>
          <span
            class="flex items-center justify-center size-6 font-semibold rounded-full"
            :class="isToday(day) ? 'bg-primary text-inverted' : 'text-highlighted'"
          >
            {{ day.getDate() }}
          </span>
        </div>
      </div>

      <div
        v-if="allDayEvents.length"
        class="grid gap-y-1 pb-1 border-t border-default"
        :style="gridStyle"
      >
        <span class="row-span-full self-center text-[10px] text-dimmed text-end pe-2">
          all-day
        </span>

        <CalendarEventChip
          v-for="{ event, colStart, colSpan, lane } in allDayEvents"
          :key="event.id"
          :event="event"
          class="mx-1 mt-1"
          :style="{ gridColumn: `${colStart + 2} / span ${colSpan}`, gridRow: lane + 1 }"
        />
      </div>
    </div>
  </div>
</template>
