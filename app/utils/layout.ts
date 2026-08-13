import { differenceInCalendarDays, differenceInMinutes, startOfDay } from 'date-fns'

export const HOUR_HEIGHT = 64
export const PX_PER_MINUTE = HOUR_HEIGHT / 60
export const SNAP_MINUTES = 15
export const MIN_EVENT_MINUTES = 30

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

export function overlapsDay(event: CalendarEvent, day: Date): boolean {
  const start = startOfDay(day).getTime()
  const end = start + 24 * 60 * 60 * 1000

  return new Date(event.start).getTime() < end && new Date(event.end).getTime() > start
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
