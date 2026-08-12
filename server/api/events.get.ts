import { z } from 'zod'

const querySchema = z.object({
  start: z.iso.datetime(),
  end: z.iso.datetime()
})

export default defineEventHandler(async (event): Promise<CalendarEvent[]> => {
  const query = await getValidatedQuery(event, querySchema.parse)
  const start = new Date(query.start).getTime()
  const end = new Date(query.end).getTime()

  return [...useStore().events.values()].filter((event) => {
    return new Date(event.start).getTime() < end && new Date(event.end).getTime() > start
  })
})
