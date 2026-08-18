import { addDays, addMinutes, startOfDay } from 'date-fns'

export interface EventDraft {
  start: Date
  end: Date
  allDay: boolean
  title: string
  calendarId: string
  description: string
}

// Where a gesture started, and what it should draw there. The month grid has
// no time axis, so a double click on it falls back to a fixed hour while its
// drag draws the same all-day span the week view's top row does
export interface GridTarget {
  kind: 'timed' | 'allDay' | 'month'
  day: Date
}

interface Gesture {
  target: GridTarget
  x: number
  y: number
  rect: DOMRect
  anchorMinutes: number
  anchorDate: Date
  currentDate: Date
  moved: boolean
}

// What a double click and the `+` button draw on a grid with no time under
// the pointer
const DEFAULT_HOUR = 9
// What an unnamed draft is called, on the ghost and once it is saved
export const DEFAULT_TITLE = 'New Event'

const _useEventDraft = () => {
  const { date, pathFor } = useCalendar()
  const { calendars, hiddenCalendars, addEvent } = useCalendarEvents()

  const draft = shallowRef<EventDraft | null>(null)
  // The pointer is still down: the ghost is being drawn and the popover waits
  // for it to settle
  const drawing = ref(false)
  const open = computed(() => !!draft.value && !drawing.value)

  // Grids that can draw a ghost, and the ghost currently anchoring the
  // popover. The error page has neither
  const hosts = ref(0)
  const anchors = ref(0)
  // Only arms once a ghost has mounted, so a draft is not thrown away in the
  // frames between creating it and the row it belongs to rendering
  let everAnchored = false

  // Set by the `+` path and consumed by the ghost that mounts for it
  const pendingScroll = ref(false)
  let origin: HTMLElement | null = null

  // The draft rides through `layoutDay` and `layoutAllDay` as an event of its
  // own, so it takes a real slot and the day reflows around it
  const draftEvent = computed<CalendarEvent | null>(() => draft.value && {
    id: DRAFT_EVENT_ID,
    calendarId: draft.value.calendarId,
    title: draft.value.title,
    start: toLocalISO(draft.value.start),
    end: toLocalISO(draft.value.end),
    allDay: draft.value.allDay || undefined
  })

  // A hidden calendar would make the event vanish the moment it is created
  function defaultCalendarId(): string {
    const visible = calendars.value.find(calendar => !hiddenCalendars.value.includes(calendar.id))

    return visible?.id ?? calendars.value[0]?.id ?? 'work'
  }

  function createDraft(input: { start: Date, end: Date, allDay?: boolean, scroll?: boolean }) {
    draft.value = {
      start: input.start,
      end: input.end,
      allDay: input.allDay ?? false,
      title: '',
      calendarId: defaultCalendarId(),
      description: ''
    }

    everAnchored = false
    pendingScroll.value = input.scroll ?? false
    origin = document.activeElement as HTMLElement | null
  }

  // Shallow, so the form has to hand back a whole object rather than mutate
  // the `Date`s the layout is reading
  function updateDraft(patch: Partial<EventDraft>) {
    if (draft.value) {
      draft.value = { ...draft.value, ...patch }
    }
  }

  function discardDraft(refocus = false) {
    if (!draft.value) {
      return
    }

    draft.value = null
    drawing.value = false
    pendingScroll.value = false
    everAnchored = false

    const target = origin
    origin = null

    // Only where the draft was closed deliberately: an outside click has
    // already put the focus wherever it landed
    if (refocus && target?.isConnected) {
      target.focus()
    }
  }

  // Everything the event needs is already on the draft, there is no form to
  // hand it over: what the ghost is showing is what gets saved
  function commitDraft() {
    if (!draft.value) {
      return
    }

    addEvent({
      id: crypto.randomUUID(),
      calendarId: draft.value.calendarId,
      title: draft.value.title || DEFAULT_TITLE,
      description: draft.value.description || undefined,
      start: toLocalISO(draft.value.start),
      end: toLocalISO(draft.value.end),
      allDay: draft.value.allDay || undefined
    })

    discardDraft()
  }

  // The `+` button, `n` and the command palette. They draw on the date the
  // route is on rather than navigating somewhere else
  async function createAtAnchor() {
    // Nowhere to draw here, so land on a grid first
    if (!hosts.value) {
      await navigateTo(pathFor(date.value))
    }

    // `getHours() + 1` alone rolls a draft started at 23:xx into the next day
    const hour = Math.min(23, new Date().getHours() + 1)
    const start = addMinutes(startOfDay(toDate(date.value)), hour * 60)

    createDraft({ start, end: addMinutes(start, 60), scroll: true })
  }

  let gesture: Gesture | null = null

  // Events and the ghost handle their own pointers, and the day numbers and
  // the "+N more" button are links and buttons of their own
  function onEmptySpace(event: Event): boolean {
    return !(event.target as HTMLElement | null)?.closest('[data-event],[data-draft],a,button,[role="button"]')
  }

  // Bound for the length of a gesture only. The month view recycles the cell
  // a drag started on, which is why this is on the document rather than the
  // pointer capture `useEventDrag` can rely on
  function bind() {
    document.addEventListener('pointermove', onPointermove)
    document.addEventListener('pointerup', onPointerup)
    document.addEventListener('pointercancel', onPointerup)
  }

  function unbind() {
    document.removeEventListener('pointermove', onPointermove)
    document.removeEventListener('pointerup', onPointerup)
    document.removeEventListener('pointercancel', onPointerup)
  }

  function endGesture() {
    gesture = null
    unbind()
    drawing.value = false
  }

  function geometry(event: PointerEvent): { start: Date, end: Date, allDay: boolean } {
    const current = gesture!

    if (current.target.kind === 'timed') {
      const day = startOfDay(current.target.day)
      const minutes = minutesInColumn(event.clientY, current.rect)
      const from = Math.min(current.anchorMinutes, minutes)
      // A drag that never leaves its snap step would give an empty event,
      // which the layout drops and nothing would be drawn
      const to = Math.max(Math.max(current.anchorMinutes, minutes), from + SNAP_MINUTES)

      return { start: addMinutes(day, from), end: addMinutes(day, to), allDay: false }
    }

    // Keeps the last day it was over once the pointer leaves the grid
    current.currentDate = dateAtPoint(event.clientX, event.clientY) ?? current.currentDate

    const from = current.anchorDate < current.currentDate ? current.anchorDate : current.currentDate
    const to = current.anchorDate < current.currentDate ? current.currentDate : current.anchorDate

    return { start: startOfDay(from), end: addDays(startOfDay(to), 1), allDay: true }
  }

  function onGridPointerdown(event: PointerEvent, target: GridTarget) {
    // A touch drag has to stay a scroll. Nothing stands the second press of a
    // double click down: `PointerEvent.detail` is 0 by spec, and the ghost the
    // double click draws replaces whatever that press managed to start
    if (event.button !== 0 || event.pointerType === 'touch' || !onEmptySpace(event)) {
      return
    }

    // The column top is midnight, and measuring it once is what keeps the
    // move handler off the layout
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()

    gesture = {
      target,
      x: event.clientX,
      y: event.clientY,
      rect,
      anchorMinutes: minutesInColumn(event.clientY, rect, 'floor'),
      anchorDate: target.day,
      currentDate: target.day,
      moved: false
    }

    bind()
  }

  function onPointermove(event: PointerEvent) {
    if (!gesture) {
      return
    }

    // Nothing exists until the pointer has travelled: a plain click creates
    // no draft, so neither half of a double click has one to dismiss
    if (!gesture.moved) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < DRAG_THRESHOLD) {
        return
      }

      gesture.moved = true
      drawing.value = true
      createDraft(geometry(event))

      return
    }

    updateDraft(geometry(event))
  }

  function onPointerup() {
    if (gesture) {
      endGesture()
    }
  }

  function onGridDblclick(event: MouseEvent, target: GridTarget) {
    if (!onEmptySpace(event)) {
      return
    }

    // Or the second click selects the hour label under the pointer
    event.preventDefault()
    getSelection()?.removeAllRanges()

    const day = startOfDay(target.day)

    if (target.kind === 'allDay') {
      createDraft({ start: day, end: addDays(day, 1), allDay: true })

      return
    }

    const minutes = target.kind === 'month'
      ? DEFAULT_HOUR * 60
      : minutesInColumn(event.clientY, (event.currentTarget as HTMLElement).getBoundingClientRect(), 'floor')
    const start = addMinutes(day, minutes)

    createDraft({ start, end: addMinutes(start, 60) })
  }

  // A view that can draw a ghost, so `createAtAnchor` knows whether it has to
  // navigate to one first
  function registerHost() {
    onMounted(() => hosts.value++)
    onUnmounted(() => hosts.value--)
  }

  function registerAnchor() {
    onMounted(() => {
      anchors.value++
      everAnchored = true
    })
    onUnmounted(() => anchors.value--)
  }

  // Losing the ghost is how the draft learns it has nowhere left to live:
  // navigating, switching view, the month virtualizer recycling its row, the
  // small-screen week window sliding past its day, or a date typed into the
  // form that lands outside the range on screen. Watching the route would not
  // do, the month view rewrites it on every scroll. It saves rather than
  // discards, on the same reading as closing the form: only Escape throws a
  // draft away, so a title typed into one is never lost to a keystroke
  watch(anchors, (count) => {
    if (count || !draft.value || !everAnchored) {
      return
    }

    // A ghost changing container unmounts during the patch and mounts back
    // after it, so its replacement gets a tick to turn up
    nextTick(() => {
      if (!anchors.value) {
        commitDraft()
      }
    })
  })

  useEventListener('keydown', (event: KeyboardEvent) => {
    // Cancels the drawing outright. Once the popover is up, Escape is its own
    // and dismissing it discards the draft from there
    if (event.key === 'Escape' && gesture?.moved) {
      endGesture()
      discardDraft()
    }
  })

  // Releasing the pointer outside the window after switching apps fires
  // neither pointerup nor pointercancel
  useEventListener('blur', () => {
    if (gesture) {
      endGesture()
    }
  })

  return {
    draft,
    drawing,
    open,
    draftEvent,
    pendingScroll,
    createDraft,
    updateDraft,
    discardDraft,
    commitDraft,
    createAtAnchor,
    onGridPointerdown,
    onGridDblclick,
    registerHost,
    registerAnchor
  }
}

export const useEventDraft = createAppComposable(_useEventDraft)
