import { differenceInCalendarDays, differenceInMinutes, startOfDay } from 'date-fns'

export const HOUR_HEIGHT = 64
export const PX_PER_MINUTE = HOUR_HEIGHT / 60
export const SNAP_MINUTES = 15
// The painted minimum, not a duration floor: a 15-minute event (the resize
// snap is the real minimum) still draws at this height to stay readable
export const MIN_EVENT_MINUTES = 30
export const DAY_MINUTES = 24 * 60
// How far the pointer has to travel before a gesture counts as a drag rather
// than a click, shared by the move/resize drag and the create drag
export const DRAG_THRESHOLD = 5
// The id the draft carries through the layout, so a view can tell the event
// being drawn apart from a real one
export const DRAFT_EVENT_ID = 'draft'

export interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
}

export interface AllDayPositionedEvent {
  event: CalendarEvent
  colStart: number
  colSpan: number
  lane: number
}

// Cluster + column packing, the same approach Google Calendar uses: events
// that transitively overlap form a cluster, each cluster splits into the
// minimum number of columns
export function layoutDay(events: CalendarEvent[], day: Date): PositionedEvent[] {
  const dayStart = startOfDay(day)

  const items = events
    .map((event) => {
      const startMin = Math.max(0, differenceInMinutes(new Date(event.start), dayStart))
      const endMin = Math.min(24 * 60, differenceInMinutes(new Date(event.end), dayStart))

      return { event, startMin, endMin }
    })
    .filter(item => item.endMin > item.startMin)
    // Events shorter than the minimum are drawn past their real end, so the
    // packing runs on what is painted or they would overlap on screen
    .map(item => ({ ...item, endMin: Math.max(item.endMin, item.startMin + MIN_EVENT_MINUTES) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const positioned: PositionedEvent[] = []

  let cluster: typeof items = []
  let clusterEnd = -Infinity

  function flush() {
    const columns: number[] = []
    const assigned = cluster.map((item) => {
      let index = columns.findIndex(end => end <= item.startMin)
      if (index === -1) {
        index = columns.length
      }
      columns[index] = item.endMin

      return index
    })

    for (const [index, item] of cluster.entries()) {
      positioned.push({
        event: item.event,
        top: item.startMin * PX_PER_MINUTE,
        height: (item.endMin - item.startMin) * PX_PER_MINUTE,
        left: assigned[index]! / columns.length * 100,
        width: 100 / columns.length
      })
    }
  }

  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) {
      flush()
      cluster = []
      clusterEnd = -Infinity
    }

    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }

  if (cluster.length) {
    flush()
  }

  return positioned
}

// Greedy lane packing for the all-day header row
export function layoutAllDay(events: CalendarEvent[], days: Date[]): AllDayPositionedEvent[] {
  const first = days[0]
  if (!first) {
    return []
  }

  const items = events
    .map((event) => {
      const colStart = Math.max(0, differenceInCalendarDays(new Date(event.start), first))
      const colEnd = Math.min(days.length, differenceInCalendarDays(new Date(event.end), first))

      return { event, colStart, colSpan: colEnd - colStart }
    })
    .filter(item => item.colSpan > 0)
    .sort((a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan)

  const lanes: number[] = []

  return items.map((item) => {
    let lane = lanes.findIndex(end => end <= item.colStart)
    if (lane === -1) {
      lane = lanes.length
    }
    lanes[lane] = item.colStart + item.colSpan

    return { ...item, lane }
  })
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

export function minutesFromOffset(px: number): number {
  return px / PX_PER_MINUTE
}

// The minute of the day a pointer sits at inside a day column, snapped and
// clamped to the day. A click floors to the slot it landed in, a drag rounds
// to the edge it is closest to
export function minutesInColumn(clientY: number, rect: DOMRect, mode: 'floor' | 'nearest' = 'nearest'): number {
  const raw = minutesFromOffset(clientY - rect.top)
  const snapped = mode === 'floor' ? Math.floor(raw / SNAP_MINUTES) * SNAP_MINUTES : snapMinutes(raw)

  return Math.min(DAY_MINUTES, Math.max(0, snapped))
}

// The geometry an event block and the draft ghost share, the block adds its
// own drag transform on top
export function eventBlockStyle(positioned: PositionedEvent, height = positioned.height) {
  return {
    // Clears the hour lines it starts and ends on by a pixel, the same gap it
    // leaves on both inline edges, so the grid shows between blocks
    top: `${positioned.top + 2}px`,
    height: `${height - 3}px`,
    insetInlineStart: `calc(${positioned.left}% + 1px)`,
    width: `calc(${positioned.width}% - 2px)`
  }
}
