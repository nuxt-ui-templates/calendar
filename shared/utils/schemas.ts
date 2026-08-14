import { z } from 'zod'
import { toLocalISO } from './time'

// `local: true` also lets Z-suffixed strings (pre-floating deployments) and
// seconds-less ones through, so anything off the canonical 19-character
// `YYYY-MM-DDTHH:mm:ss` form is rewritten before it reaches the store and
// the two representations never mix
export const localDatetime = z.iso.datetime({ local: true })
  .transform(value => value.length === 19 ? value : toLocalISO(new Date(value)))

export const eventSchema = z.object({
  id: z.string().min(1),
  calendarId: z.string().min(1, 'Calendar is required'),
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(1000).optional(),
  start: localDatetime,
  end: localDatetime,
  allDay: z.boolean().optional()
}).refine(event => new Date(event.end) > new Date(event.start), {
  message: 'End must be after start',
  path: ['end']
})

export type EventSchema = z.output<typeof eventSchema>
