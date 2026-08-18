import { addDays, differenceInCalendarDays } from 'date-fns'

// Moving a chip is a whole-day gesture: the month grid has no time axis and an
// all-day bar keeps the span it has, so only the date shifts. `useEventDrag`
// stays with the week grid's timed blocks, where the vertical axis is minutes.
//
// One instance for the whole app rather than one per chip. The month view puts
// a few hundred chips on screen, and a composable each would put its listeners
// and its refs behind every one of them
const _useEventMove = () => {
  const { updateEvent } = useCalendarEvents()

  const source = shallowRef<CalendarEvent | null>(null)
  const deltaDays = ref(0)
  // Keeps the popover from opening on the click that ends a drag
  const suppressed = ref(false)

  // The id a view drops from its own layout while the event is in flight
  const movingId = computed(() => source.value?.id ?? null)

  // Where it would land, fed back through the layout so it draws in the cell
  // the pointer is over rather than being dragged over the top of one
  const preview = computed<CalendarEvent | null>(() => {
    if (!source.value || !deltaDays.value) {
      return source.value
    }

    // `addDays` rather than the epoch, so the wall clock survives a DST edge
    return {
      ...source.value,
      start: toLocalISO(addDays(new Date(source.value.start), deltaDays.value)),
      end: toLocalISO(addDays(new Date(source.value.end), deltaDays.value))
    }
  })

  let gesture: { event: CalendarEvent, x: number, y: number, origin: Date, current: Date, moved: boolean, cancelled: boolean } | null = null

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

  function reset() {
    gesture = null
    unbind()
    source.value = null
    deltaDays.value = 0
  }

  // Let the trailing click pass before the popover is allowed to open again
  function release() {
    setTimeout(() => {
      suppressed.value = false
    })
  }

  function onPointerdown(pointerEvent: PointerEvent, event: CalendarEvent) {
    // A touch drag has to stay a scroll
    if (pointerEvent.button !== 0 || pointerEvent.pointerType === 'touch') {
      return
    }

    // A chip listed in a "+N more" popover is drawn over the grid rather than
    // in it, and `dateAtPoint` hit-tests through the popover to whichever cell
    // happens to sit behind it. There is no day under that pointer to move to
    if ((pointerEvent.target as HTMLElement).closest('[data-reka-popper-content-wrapper]')) {
      return
    }

    // The day under the pointer rather than the event's own start: a bar
    // grabbed in the middle should travel the days the pointer does
    const origin = dateAtPoint(pointerEvent.clientX, pointerEvent.clientY)
    if (!origin) {
      return
    }

    gesture = { event, x: pointerEvent.clientX, y: pointerEvent.clientY, origin, current: origin, moved: false, cancelled: false }

    bind()
  }

  function onPointermove(pointerEvent: PointerEvent) {
    if (!gesture || gesture.cancelled) {
      return
    }

    if (!gesture.moved) {
      if (Math.hypot(pointerEvent.clientX - gesture.x, pointerEvent.clientY - gesture.y) < DRAG_THRESHOLD) {
        return
      }

      gesture.moved = true
      suppressed.value = true
      // Only past the threshold, so a plain click never drops the event out of
      // its own cell for a frame
      source.value = gesture.event
    }

    // Keeps the last day it was over once the pointer leaves the grid
    gesture.current = dateAtPoint(pointerEvent.clientX, pointerEvent.clientY) ?? gesture.current

    deltaDays.value = differenceInCalendarDays(gesture.current, gesture.origin)
  }

  function onPointerup() {
    if (!gesture) {
      return
    }

    const event = source.value
    const delta = deltaDays.value

    if (gesture.moved && event && delta) {
      updateEvent({
        ...event,
        start: toLocalISO(addDays(new Date(event.start), delta)),
        end: toLocalISO(addDays(new Date(event.end), delta))
      })
    }

    reset()
    release()
  }

  useEventListener('keydown', (keyboardEvent: KeyboardEvent) => {
    // Cancels the move but holds on to the gesture: the pointer is still down,
    // and its release is both what clears the suppression and what unbinds the
    // listeners that would carry it. Cancelled rather than un-moved, or the
    // next move would clear the travel threshold again and pick it right back up
    if (keyboardEvent.key === 'Escape' && gesture?.moved) {
      gesture.cancelled = true
      gesture.moved = false
      source.value = null
      deltaDays.value = 0
    }
  })

  // A gesture can end without a pointer event: releasing outside the window
  // after switching apps fires neither pointerup nor pointercancel
  useEventListener('blur', () => {
    if (gesture || suppressed.value) {
      reset()
      release()
    }
  })

  return {
    movingId,
    preview,
    suppressed,
    onPointerdown
  }
}

export const useEventMove = createAppComposable(_useEventMove)
