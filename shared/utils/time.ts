import { lightFormat } from 'date-fns'

// Events are stored as floating local datetimes, no timezone designator:
// `new Date()` parses them in the viewer's own timezone, so the 09:15
// stand-up is 09:15 for every visitor and all-day events keep their day
// wherever the server runs. Date-only strings would parse as UTC instead,
// so always emit the full date-time form. Seconds are pinned to zero, the
// calendar is minute-granular
export function toLocalISO(date: Date): string {
  return lightFormat(date, 'yyyy-MM-dd\'T\'HH:mm:00')
}

// How far the calendar reaches either side of the current week: the month
// view virtualizes this many week rows and the server seeds events for all
// of them, so scrolling in any direction stays populated
export const WEEKS_AROUND = 260
