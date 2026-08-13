<script setup lang="ts">
import { addDays, addWeeks, differenceInCalendarWeeks, startOfWeek } from 'date-fns'
import type { CalendarDate } from '@internationalized/date'

// ±5 years of week rows, virtualized so only the visible ones render
const WEEKS_AROUND = 260
const ROW_HEIGHT = 140
const CHUNK_WEEKS = 6
// Height of a month label, spacing the sticky stack in the overlay
const LABEL_HEIGHT = 32
// The scroll area starts at the page top so events show through the blurred
// chrome: the header (--ui-header-height, 4rem) plus the weekday bar (h-10,
// the height of the week view's own day header) the grid rests under via the
// virtualizer's `paddingStart`
const HEADER_HEIGHT = 64
const WEEKDAY_HEIGHT = 40
const CHROME_HEIGHT = HEADER_HEIGHT + WEEKDAY_HEIGHT
// Docked label top within the page (`top-4` on the overlay) and the rest
// position of the first grid row in overlay coordinates
const DOCK_TOP = (HEADER_HEIGHT - LABEL_HEIGHT) / 2
const GRID_TOP = CHROME_HEIGHT - DOCK_TOP

const { date, pathFor, visibleMonth } = useCalendar()
const { loadRange } = useCalendarEvents()

const scrollElement = shallowRef<Element | null>(null)

const firstWeek = addWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), -WEEKS_AROUND)
const weeks = Array.from({ length: WEEKS_AROUND * 2 + 1 }, (_, index) => addWeeks(firstWeek, index))

function indexOf(day: Date): number {
  return Math.min(weeks.length - 1, Math.max(0, differenceInCalendarWeeks(day, firstWeek, { weekStartsOn: 1 })))
}

// SSR fallback: the anchor month as a static grid, swapped for the
// virtualized list once mounted
const fallbackWeeks = computed(() => {
  const start = monthRange(date.value).start

  return Array.from({ length: 6 }, (_, index) => addWeeks(start, index))
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

// The docked month is the one whose inline label most recently crossed the
// header: the month of the last day of the top visible week
function dockedMonth(): CalendarDate | null {
  const offset = scrollElement.value?.scrollTop

  if (offset == null) {
    return null
  }

  const top = Math.min(weeks.length - 1, Math.max(0, Math.floor(offset / ROW_HEIGHT)))

  return toCalendarDate(addDays(weeks[top]!, 6)).set({ day: 1 })
}

function updateDockedMonth() {
  const docked = dockedMonth()

  if (docked && (!visibleMonth.value || docked.compare(visibleMonth.value) !== 0)) {
    visibleMonth.value = docked
  }
}

// One real label per month, rendered in an overlay spanning the header and
// the grid: it rides the week row containing the 1st, slides behind the
// weekday bar, docks at the header title spot and is pushed out through the
// top by the next month's incoming label, like Apple Calendar
const labels = shallowRef<{ key: string, month: string, year: string, y: number }[]>([])

function labelOffset(month: CalendarDate): number {
  return indexOf(monthRange(month).start) * ROW_HEIGHT
}

function updateLabels() {
  const element = scrollElement.value
  const docked = dockedMonth()

  if (!element || !docked) {
    return
  }

  // The docked month plus every month whose label row is in the viewport
  const months = [docked]
  while (months.length < 4) {
    const next = months[months.length - 1]!.add({ months: 1 })

    if (labelOffset(next) > element.scrollTop + element.clientHeight) {
      break
    }

    months.push(next)
  }

  // Each label rides its row, then leads the scroll over the last stretch
  // so it reaches the docked spot (y 0, the overlay top) exactly as its row
  // hits the top of the grid, where it rests until pushed out
  const positions = months.map((month) => {
    const distance = labelOffset(month) - element.scrollTop

    return Math.max(distance >= GRID_TOP ? GRID_TOP + distance : distance * 2, 0)
  })

  for (let index = positions.length - 2; index >= 0; index--) {
    positions[index] = Math.min(positions[index]!, positions[index + 1]! - LABEL_HEIGHT)
  }

  labels.value = months.map((month, index) => ({
    key: month.toString(),
    month: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(toDate(month)),
    year: String(month.year),
    y: positions[index]!
  }))
}

// `@scroll` on the scroll area only fires when scrolling starts and stops,
// the native event drives the per-pixel docking and label positions
useEventListener(scrollElement, 'scroll', () => {
  updateDockedMonth()
  updateLabels()
  loadVisibleChunks()
}, { passive: true })

useEventListener('resize', updateLabels)

// The scroll area mounts after this component (behind ClientOnly) and its
// scroll element attaches asynchronously, so keep trying until the initial
// position actually applies (it cannot while the tab is in the background)
onMounted(async () => {
  for (let attempt = 0; attempt < 60; attempt++) {
    const element = getVirtualizer()?.scrollElement

    if (element) {
      scrollElement.value = element
      scrollToMonth(date.value)

      if (element.scrollTop > 0) {
        updateDockedMonth()
        updateLabels()
        loadVisibleChunks()
        return
      }
    }

    await new Promise(resolve => setTimeout(resolve, 50))
  }
})

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
})
</script>

<template>
  <div class="relative flex-1 flex flex-col min-h-0">
    <ClientOnly>
      <UScrollArea
        ref="scrollArea"
        :items="weeks"
        :virtualize="{ estimateSize: ROW_HEIGHT, skipMeasurement: true, overscan: 4, paddingStart: CHROME_HEIGHT, scrollPaddingStart: CHROME_HEIGHT }"
        class="flex-1 [view-transition-name:calendar]"
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

    <!-- Above the labels so incoming ones slide behind its blur -->
    <div class="absolute top-(--ui-header-height) inset-x-0 z-30 h-10 grid grid-cols-7 bg-default/50 backdrop-blur border-b border-default">
      <span
        v-for="day in 7"
        :key="day"
        class="flex items-center justify-end pe-2 text-sm text-muted border-default"
        :class="day !== 1 && 'border-s'"
      >
        {{ new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(addDays(firstWeek, day - 1)) }}
      </span>
    </div>

    <!-- Month labels, from the docked header title spot (the overlay top,
      also its clip line) down over the grid -->
    <div
      class="absolute inset-x-0 top-4 bottom-0 z-20 overflow-hidden pointer-events-none"
    >
      <div
        v-for="label in labels"
        :key="label.key"
        class="absolute top-0 inset-s-4 sm:inset-s-6 flex items-baseline gap-1.5 h-8 text-xl sm:text-2xl tracking-tight"
        :style="{ translate: `0 ${label.y}px` }"
      >
        <span class="font-bold text-highlighted">{{ label.month }}</span>
        <span class="font-normal text-muted">{{ label.year }}</span>
      </div>
    </div>
  </div>
</template>
