import { addMinutes } from 'date-fns'

const DRAG_THRESHOLD = 5

// Pointer-capture drag to move (across days) or resize (bottom handle) an
// event block, snapped to 15-minute increments. The block itself is
// translated as a ghost preview, the real update only happens on drop.
export function useEventDrag(
  event: MaybeRefOrGetter<CalendarEvent>,
  options: { onCommit: (start: Date, end: Date) => void }
) {
  const dragging = ref(false)
  // Keeps the popover from opening on the click that ends a drag
  const suppressed = ref(false)
  const mode = ref<'move' | 'resize'>('move')
  const deltaMinutes = ref(0)
  const deltaDays = ref(0)
  const deltaX = ref(0)

  let active = false
  let startX = 0
  let startY = 0
  let columnRects: DOMRect[] = []
  let columnIndex = -1

  function reset() {
    active = false
    dragging.value = false
    deltaMinutes.value = 0
    deltaDays.value = 0
    deltaX.value = 0
  }

  function onPointerdown(pointerEvent: PointerEvent) {
    if (pointerEvent.button !== 0) {
      return
    }

    const target = pointerEvent.currentTarget as HTMLElement

    mode.value = (pointerEvent.target as HTMLElement).closest('[data-resize-handle]') ? 'resize' : 'move'
    startX = pointerEvent.clientX
    startY = pointerEvent.clientY

    // Measure the day columns once per drag, they are the geometry source
    const grid = target.closest('[data-week-grid]')
    columnRects = grid ? [...grid.querySelectorAll('[data-day-column]')].map(column => column.getBoundingClientRect()) : []
    columnIndex = columnRects.findIndex(rect => pointerEvent.clientX >= rect.left && pointerEvent.clientX < rect.right)

    target.setPointerCapture(pointerEvent.pointerId)
    active = true
  }

  function onPointermove(pointerEvent: PointerEvent) {
    if (!active) {
      return
    }

    const dx = pointerEvent.clientX - startX
    const dy = pointerEvent.clientY - startY

    if (!dragging.value) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return
      }

      dragging.value = true
      suppressed.value = true
    }

    deltaMinutes.value = snapMinutes(dy / PX_PER_MINUTE)

    if (mode.value === 'move' && columnIndex !== -1) {
      const targetIndex = columnRects.findIndex(rect => pointerEvent.clientX >= rect.left && pointerEvent.clientX < rect.right)

      if (targetIndex !== -1) {
        deltaDays.value = targetIndex - columnIndex
        deltaX.value = columnRects[targetIndex]!.left - columnRects[columnIndex]!.left
      }
    }
  }

  function onPointerup() {
    if (!active) {
      return
    }

    if (dragging.value && (deltaMinutes.value !== 0 || deltaDays.value !== 0)) {
      const source = toValue(event)
      const start = new Date(source.start)
      const end = new Date(source.end)

      if (mode.value === 'move') {
        const shift = deltaDays.value * 24 * 60 + deltaMinutes.value
        options.onCommit(addMinutes(start, shift), addMinutes(end, shift))
      } else {
        const resized = addMinutes(end, deltaMinutes.value)
        options.onCommit(start, resized > addMinutes(start, SNAP_MINUTES) ? resized : addMinutes(start, SNAP_MINUTES))
      }
    }

    reset()
    // Let the trailing click event pass before re-enabling the popover
    setTimeout(() => {
      suppressed.value = false
    })
  }

  useEventListener('keydown', (keyboardEvent: KeyboardEvent) => {
    if (keyboardEvent.key === 'Escape' && dragging.value) {
      reset()
      setTimeout(() => {
        suppressed.value = false
      })
    }
  })

  return {
    dragging,
    suppressed,
    mode,
    deltaMinutes,
    deltaX,
    onPointerdown,
    onPointermove,
    onPointerup
  }
}
