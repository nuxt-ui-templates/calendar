import { parseDate, type CalendarDate } from '@internationalized/date'

const _useCalendar = () => {
  const route = useRoute()

  const view = computed<CalendarView>(() => {
    return ['day', 'month'].includes(route.params.view as string) ? route.params.view as CalendarView : 'week'
  })

  const date = computed<CalendarDate>(() => {
    try {
      return parseDate(route.params.date as string)
    } catch {
      return todayDate()
    }
  })

  const range = computed<DateRange>(() => rangeFor(view.value, date.value))

  // The month docked at the top of the month view scroll viewport, kept in
  // sync live while scrolling so the header title follows along
  const visibleMonth = shallowRef<CalendarDate | null>(null)

  // While it scrolls, the month view slides its own copies of the header
  // title over the grid, the docked one landing right on top of the h1. The
  // header hands the title over to them for as long as they are up, or the
  // one leaving the dock and the h1 would drift apart in plain sight
  const monthLabelsVisible = refAutoReset(false, 600)

  const title = computed<RangeTitle>(() => {
    if (view.value === 'month') {
      const focus = visibleMonth.value ?? date.value

      return {
        months: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(toDate(focus)),
        year: String(focus.year)
      }
    }

    return formatRangeTitle(range.value)
  })

  const step = computed(() => view.value === 'month' ? { months: 1 } : { days: view.value === 'day' ? 1 : 7 })

  const prevDate = computed(() => date.value.subtract(step.value))
  const nextDate = computed(() => date.value.add(step.value))

  function pathFor(target: CalendarDate, targetView: CalendarView = view.value): string {
    return `/${targetView}/${target.toString()}`
  }

  // Drives the slide direction of the view transition, cleared once it finishes
  function setDirection(direction: 'left' | 'right') {
    if (import.meta.client) {
      document.documentElement.dataset.navDirection = direction
    }
  }

  const nuxtApp = useNuxtApp()
  nuxtApp.hook('page:view-transition:start', (transition) => {
    // An aborted transition (hidden tab, rapid navigation) rejects `finished`
    transition.finished.catch(() => {}).then(() => {
      delete document.documentElement.dataset.navDirection
    })
  })

  // One model for the two states the sidebar keeps: expanded on desktop, the
  // slideover menu below `lg`. It starts open so the server renders the
  // expanded sidebar, the component closes it itself on mount once it knows
  // the viewport is a small one
  const isSidebarOpen = ref(true)

  const isEventModalOpen = ref(false)
  const isCommandPaletteOpen = ref(false)
  const editingEvent = ref<CalendarEvent | null>(null)
  const eventDefaults = ref<{ start: Date, end: Date, allDay?: boolean } | null>(null)

  function createEvent(defaults?: { start: Date, end: Date, allDay?: boolean }) {
    editingEvent.value = null
    eventDefaults.value = defaults ?? null
    isEventModalOpen.value = true
  }

  function editEvent(event: CalendarEvent) {
    editingEvent.value = event
    eventDefaults.value = null
    isEventModalOpen.value = true
  }

  defineShortcuts({
    // Enabled while typing so it also closes the palette from its own input
    meta_k: {
      usingInput: true,
      handler: () => {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value
      }
    },
    t: () => navigateTo(pathFor(todayDate())),
    d: () => navigateTo(pathFor(date.value, 'day')),
    w: () => navigateTo(pathFor(date.value, 'week')),
    m: () => navigateTo(pathFor(date.value, 'month')),
    n: () => createEvent(),
    arrowleft: () => {
      setDirection('left')
      navigateTo(pathFor(prevDate.value))
    },
    arrowright: () => {
      setDirection('right')
      navigateTo(pathFor(nextDate.value))
    }
  })

  return {
    view,
    date,
    range,
    title,
    visibleMonth,
    monthLabelsVisible,
    prevDate,
    nextDate,
    pathFor,
    setDirection,
    isSidebarOpen,
    isEventModalOpen,
    isCommandPaletteOpen,
    editingEvent,
    eventDefaults,
    createEvent,
    editEvent
  }
}

export const useCalendar = createAppComposable(_useCalendar)
