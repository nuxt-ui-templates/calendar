import { z } from 'zod'

const querySchema = z.object({
  start: z.iso.datetime(),
  end: z.iso.datetime()
})

export default defineEventHandler(async (event): Promise<CalendarEvent[]> => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const start = new Date(query.start).getTime()
  const end = new Date(query.end).getTime()

  return [...useStore(event).events.values()].filter((calendarEvent) => {
    return new Date(calendarEvent.start).getTime() < end && new Date(calendarEvent.end).getTime() > start
  })
})
