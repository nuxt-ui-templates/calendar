import { z } from 'zod'
import { millisecondsInDay } from 'date-fns/constants'

// The widest client fetch is the month view's twelve-week window (the grid
// plus the fallback rows below it), so with a bit of slack anything larger
// is a misuse of the endpoint
const MAX_RANGE = 90 * millisecondsInDay

const querySchema = z.object({
  start: localDatetime,
  end: localDatetime
}).refine(query => new Date(query.end).getTime() - new Date(query.start).getTime() <= MAX_RANGE, 'Range too large')

// Parsed bounds cached per event object: every request scans the whole store
// and the `Date` parsing is what dominates that scan. Updated events are new
// objects, so stale entries just fall out
const bounds = new WeakMap<CalendarEvent, { start: number, end: number }>()

function boundsOf(event: CalendarEvent): { start: number, end: number } {
  let value = bounds.get(event)
  if (!value) {
    value = { start: new Date(event.start).getTime(), end: new Date(event.end).getTime() }
    bounds.set(event, value)
  }

  return value
}

export default defineEventHandler(async (event): Promise<CalendarEvent[]> => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const start = new Date(query.start).getTime()
  const end = new Date(query.end).getTime()

  return [...useStore(event).events.values()].filter((calendarEvent) => {
    const time = boundsOf(calendarEvent)

    return time.start < end && time.end > start
  })
})
