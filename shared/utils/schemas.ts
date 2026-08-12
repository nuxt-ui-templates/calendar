import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string().min(1),
  calendarId: z.string().min(1, 'Calendar is required'),
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(1000).optional(),
  start: z.iso.datetime(),
  end: z.iso.datetime(),
  allDay: z.boolean().optional()
}).refine(event => new Date(event.end) > new Date(event.start), {
  message: 'End must be after start',
  path: ['end']
})

export type EventSchema = z.output<typeof eventSchema>
