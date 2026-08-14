<script setup lang="ts">
import { addDays, addWeeks, differenceInCalendarWeeks, startOfWeek } from 'date-fns'
import type { CalendarDate } from '@internationalized/date'

// ±5 years of week rows (the shared `WEEKS_AROUND`, which the server seeds
// events for), virtualized so only the visible ones render
const ROW_HEIGHT = 140
const CHUNK_WEEKS = 6
// Height of a month label, spacing the sticky stack in the overlay. It is the
// `text-2xl` line box, so below `sm` the smaller title floats inside it and
// the label centers its own text to stay on the docked one
const LABEL_HEIGHT = 32
// How far a riding label sits above the top of its week row
const LABEL_LIFT = 12
// The scroll area starts at the page top so events show through the blurred
// chrome: the header (--ui-header-height, 4rem, pushed down by its pt-2) plus
// the weekday bar (h-10, the height of the week view's own day header) the
// grid rests under via the virtualizer's `paddingStart`
const HEADER_PADDING = 8
const HEADER_HEIGHT = 64
// Its bottom border is inside that height, so the band the title centers in
// is a pixel shorter than the header is
const HEADER_BORDER = 1
const WEEKDAY_HEIGHT = 40
const CHROME_HEIGHT = HEADER_PADDING + HEADER_HEIGHT + WEEKDAY_HEIGHT
// Docked label top within the page, on the center of the header title, and
// the rest position of the first grid row in overlay coordinates. The overlay
// is pinned to it, the two have to land on the same line for the handover
// between a docked label and the title to hold still
const DOCK_TOP = HEADER_PADDING + (HEADER_HEIGHT - HEADER_BORDER - LABEL_HEIGHT) / 2
const GRID_TOP = CHROME_HEIGHT - DOCK_TOP

const { date, pathFor, visibleMonth, monthLabelsVisible } = useCalendar()
const { loadRange } = useCalendarEvents()

const scrollElement = shallowRef<Element | null>(null)

const firstWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -WEEKS_AROUND)
const weeks = Array.from({ length: WEEKS_AROUND * 2 + 1 }, (_, index) => addWeeks(firstWeek, index))
const weekdays = Array.from({ length: 7 }, (_, index) => formatWeekday(addDays(firstWeek, index)))

function indexOf(day: Date): number {
  return Math.min(weeks.length - 1, Math.max(0, differenceInCalendarWeeks(day, firstWeek, { weekStartsOn: 1 })))
}

// The virtualizer renders from this offset on its very first pass, so the list
// mounts on the anchor month instead of mounting five years back and throwing
// those rows away on the scroll below. `scrollToIndex` lands on the same offset
// (`paddingStart` and `scrollPaddingStart` cancel out), so the scroll it
// triggers finds the range already right and renders nothing new
function initialOffset(): number {
  return indexOf(monthRange(date.value).start) * ROW_HEIGHT
}

// SSR fallback: the anchor month as a static grid, swapped for the
// virtualized list once mounted. As many rows as the route fetch covers, so
// a tall viewport gets real events all the way down, clipped where they
// overshoot
const fallbackWeeks = computed(() => {
  const start = monthRange(date.value).start

  return Array.from({ length: MONTH_FETCH_WEEKS }, (_, index) => addWeeks(start, index))
})

const scrollArea = useTemplateRef('scrollArea')

// The exposed `virtualizer` is a Ref, `unref` gives the TanStack instance
function getVirtualizer() {
  return unref(scrollArea.value?.virtualizer)
}

function visibleRange(): { first: number, last: number } | null {
  const items = getVirtualizer()?.getVirtualItems() ?? []
  if (!items.length) {
    return null
  }

  return { first: items[0]!.index, last: items[items.length - 1]!.index }
}

// Fetch events in aligned 6-week chunks around the viewport, deduplicated
// by `loadRange` so already loaded chunks are free
function loadVisibleChunks() {
  const visible = visibleRange()
  if (!visible) {
    return
  }

  const first = Math.max(0, Math.floor((visible.first - CHUNK_WEEKS) / CHUNK_WEEKS))
  const last = Math.min(Math.floor((weeks.length - 1) / CHUNK_WEEKS), Math.floor((visible.last + CHUNK_WEEKS) / CHUNK_WEEKS))

  for (let chunk = first; chunk <= last; chunk++) {
    const start = addWeeks(firstWeek, chunk * CHUNK_WEEKS)

    loadRange({ start, end: addWeeks(start, CHUNK_WEEKS) })
  }
}

// Jumps dock the week containing the 1st at the top, so the target month's
// label lands in the header like Apple Calendar
function scrollToMonth(target: CalendarDate, options?: { smooth?: boolean }) {
  getVirtualizer()?.scrollToIndex(indexOf(monthRange(target).start), {
    align: 'start',
    behavior: options?.smooth ? 'smooth' : 'auto'
  })
}

// All of the below runs on every scroll frame, so the date math each piece
// repeats for the same month is memoized on a plain month number: building a
// `CalendarDate` and converting it back to a `Date` are the expensive parts
function monthKey(month: CalendarDate): number {
  return month.year * 12 + month.month
}

// The docked month is the one whose inline label most recently crossed the
// header: the month of the last day of the top visible week
const dockedMonths = new Map<number, CalendarDate>()

function dockedMonth(): CalendarDate | null {
  const offset = scrollElement.value?.scrollTop

  if (offset == null) {
    return null
  }

  const top = Math.min(weeks.length - 1, Math.max(0, Math.floor(offset / ROW_HEIGHT)))

  let month = dockedMonths.get(top)
  if (!month) {
    month = toCalendarDate(addDays(weeks[top]!, 6)).set({ day: 1 })
    dockedMonths.set(top, month)
  }

  return month
}

// One real label per month, rendered in an overlay spanning the header and
// the grid: it rides the week row containing the 1st, slides behind the
// weekday bar, docks at the header title spot and is pushed out through the
// top by the next month's incoming label, like Apple Calendar
const labels = shallowRef<{ key: number, month: string, year: string, y: number }[]>([])

// They would sit over the day numbers and the events for good, so they only
// show while the list moves and fade out once it settles, like Apple
// Calendar. The header title carries the docked month the rest of the time
//
// The list scrolls itself into place on arrival, that one should not wake
// them the way a real scroll does
let labelsAwake = false

const labelOffsets = new Map<number, number>()

function labelOffset(month: CalendarDate): number {
  const key = monthKey(month)

  let offset = labelOffsets.get(key)
  if (offset === undefined) {
    offset = indexOf(monthRange(month).start) * ROW_HEIGHT
    labelOffsets.set(key, offset)
  }

  return offset
}

const labelTexts = new Map<number, { month: string, year: string }>()

function labelText(month: CalendarDate): { month: string, year: string } {
  const key = monthKey(month)

  let text = labelTexts.get(key)
  if (!text) {
    text = { month: formatMonth(toDate(month)), year: String(month.year) }
    labelTexts.set(key, text)
  }

  return text
}

let viewportHeight = 0

function updateLabels(docked: CalendarDate) {
  const offset = scrollElement.value?.scrollTop

  if (offset == null) {
    return
  }

  // The docked month plus every month whose label row is in the viewport
  const months = [docked]
  while (months.length < 4) {
    const next = months[months.length - 1]!.add({ months: 1 })

    if (labelOffset(next) > offset + viewportHeight) {
      break
    }

    months.push(next)
  }

  // Each label rides its row, then leads the scroll over the last stretch
  // so it reaches the docked spot (y 0, the overlay top) exactly as its row
  // hits the top of the grid, where it rests until pushed out
  const positions = months.map((month) => {
    const distance = labelOffset(month) - offset

    return Math.max((distance >= GRID_TOP ? GRID_TOP + distance : distance * 2) - LABEL_LIFT, 0)
  })

  for (let index = positions.length - 2; index >= 0; index--) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - LABEL_HEIGHT)
  }

  labels.value = months.map((month, index) => ({
    key: monthKey(month),
    ...labelText(month),
    y: positions[index]!
  }))
}

function update() {
  const docked = dockedMonth()

  if (!docked) {
    return
  }

  if (!visibleMonth.value || docked.compare(visibleMonth.value) !== 0) {
    visibleMonth.value = docked
  }

  updateLabels(docked)
}

// `@scroll` on the scroll area only fires when scrolling starts and stops,
// the native event drives the per-pixel docking and label positions
useEventListener(scrollElement, 'scroll', () => {
  update()
  loadVisibleChunks()

  if (labelsAwake) {
    monthLabelsVisible.value = true
  }
}, { passive: true })

// Measured off the scroll path, `clientHeight` would otherwise be read back
// right after the virtualizer writes the row styles and force a layout
function measure() {
  viewportHeight = scrollElement.value?.clientHeight ?? 0
}

useEventListener('resize', () => {
  measure()
  update()
})

function applyInitialPosition(): boolean {
  const element = getVirtualizer()?.scrollElement

  if (!element) {
    return false
  }

  scrollElement.value = element
  measure()
  scrollToMonth(date.value)

  // A background tab cannot scroll, so the position has to be retried until
  // it actually applies
  if (element.scrollTop === 0) {
    return false
  }

  update()
  loadVisibleChunks()

  // The scroll above lands its event in the next rendering step, this runs
  // after it
  requestAnimationFrame(() => {
    labelsAwake = true
  })

  return true
}

// The scroll area mounts a tick after this component (it sits behind
// ClientOnly), so the position lands in the same flush that swaps it in.
// Waiting on a timer instead let the page settle first, and the view
// transition snapshotted the list still parked on its very first week
watch(scrollArea, async () => {
  if (applyInitialPosition()) {
    return
  }

  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 50))

    if (applyInitialPosition()) {
      return
    }
  }
}, { flush: 'post', once: true })

// Scrolling owns the URL: on settle, the docked month replaces the route so
// the mini calendar and shareable URL follow along
const syncing = ref(false)

async function syncRoute() {
  const target = dockedMonth()

  if (!target || (target.year === date.value.year && target.month === date.value.month)) {
    return
  }

  syncing.value = true
  await navigateTo(pathFor(target), { replace: true })
  syncing.value = false
}

function onScroll(isScrolling: boolean) {
  if (!isScrolling) {
    syncRoute()
  }
}

// External jumps (mini calendar, prev/next, `t`) scroll the list instead
watch(() => date.value.toString(), () => {
  if (syncing.value) {
    return
  }

  // Already docked on this month (e.g. the route caught up with the
  // scroll), moving would yank the scroll position
  const docked = dockedMonth()
  if (docked && docked.year === date.value.year && docked.month === date.value.month) {
    return
  }

  const visible = visibleRange()
  const target = indexOf(monthRange(date.value).start)
  const smooth = !!visible && Math.abs(target - Math.round((visible.first + visible.last) / 2)) <= 12

  scrollToMonth(date.value, { smooth })
  loadVisibleChunks()
})

onUnmounted(() => {
  visibleMonth.value = null
  monthLabelsVisible.value = false
})
</script>

<template>
  <div class="relative flex-1 flex flex-col min-h-0">
    <ClientOnly>
      <!-- Snapped on the week rows so the grid always settles flush under the
        weekday bar, the way the docked labels assume. `scrollPaddingStart` is
        the virtualizer's own, it only offsets `scrollToIndex`, the snap
        positions need the CSS one. Proximity, not mandatory: rows mount and
        unmount as the list virtualizes and a mandatory scroller re-snaps on
        every content change -->
      <UScrollArea
        ref="scrollArea"
        :items="weeks"
        :virtualize="{ estimateSize: ROW_HEIGHT, skipMeasurement: true, overscan: 4, paddingStart: CHROME_HEIGHT, scrollPaddingStart: CHROME_HEIGHT, initialOffset }"
        :ui="{ item: 'snap-start' }"
        :style="{ scrollPaddingTop: `${CHROME_HEIGHT}px` }"
        class="flex-1 snap-y snap-proximity [view-transition-name:calendar]"
        @scroll="onScroll"
      >
        <template #default="{ item }">
          <CalendarMonthWeek
            :week-start="item"
            :style="{ height: `${ROW_HEIGHT}px` }"
          />
        </template>
      </UScrollArea>

      <template #fallback>
        <div
          class="flex-1 overflow-hidden"
          :style="{ paddingTop: `${CHROME_HEIGHT}px` }"
        >
          <CalendarMonthWeek
            v-for="week in fallbackWeeks"
            :key="week.getTime()"
            :week-start="week"
            :style="{ height: `${ROW_HEIGHT}px` }"
          />
        </div>
      </template>
    </ClientOnly>

    <!-- Under the labels so an incoming one slides over its blur, named for the
      same reason as the header: it has to sit above the grid snapshot during a
      view transition to keep blurring it -->
    <div class="absolute top-[calc(var(--ui-header-height)+0.5rem)] inset-x-0 z-30 h-10 grid grid-cols-7 glass-material bg-(--glass-bg) border-b border-default [view-transition-name:weekdays]">
      <span
        v-for="(weekday, index) in weekdays"
        :key="weekday"
        class="flex items-center justify-end pe-2 text-sm text-muted border-default"
        :class="index !== 0 && 'border-s'"
      >
        {{ weekday }}
      </span>
    </div>

    <!-- Month labels, from the docked header title spot (the overlay top,
      also its clip line) down over the grid. Quick to come back once the list
      moves, slower on the way out. Docked, one lands on the header title, so
      it starts where the title does: past the menu button and its gap below
      `lg`, on the header padding above -->
    <div
      class="absolute inset-x-0 bottom-0 z-40 overflow-hidden pointer-events-none transition-opacity"
      :class="monthLabelsVisible ? 'opacity-100 duration-150' : 'opacity-0 duration-300'"
      :style="{ top: `${DOCK_TOP}px` }"
    >
      <div
        v-for="label in labels"
        :key="label.key"
        class="absolute top-0 inset-s-13 lg:inset-s-4 flex items-center gap-1.5 h-8 text-xl sm:text-2xl tracking-tight will-change-[translate]"
        :style="{ translate: `0 ${label.y}px` }"
      >
        <span class="font-bold text-highlighted">{{ label.month }}</span>
        <!-- Dropped where the header title drops it, or the docked one would
          hand a year over to a title that has none -->
        <span class="font-normal text-muted hidden sm:inline">{{ label.year }}</span>
      </div>
    </div>
  </div>
</template>
