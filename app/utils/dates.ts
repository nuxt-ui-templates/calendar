import { CalendarDate, getLocalTimeZone, Time, toCalendarDateTime, today } from '@internationalized/date'
import { addDays, startOfMonth, startOfWeek } from 'date-fns'

export function toCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}

export function toTime(date: Date): Time {
  return new Time(date.getHours(), date.getMinutes())
}

export function toDate(date: CalendarDate): Date {
  return date.toDate(getLocalTimeZone())
}

export function toDateTime(date: CalendarDate, time: Time): Date {
  return toCalendarDateTime(date, time).toDate(getLocalTimeZone())
}

export function todayDate(): CalendarDate {
  return today(getLocalTimeZone())
}

// Ranges are [start, end) so the end boundary is the first excluded instant
export function weekRange(date: CalendarDate, days = 7): DateRange {
  const start = days === 7 ? startOfWeek(toDate(date), { weekStartsOn: 1 }) : toDate(date)

  return { start, end: addDays(start, days) }
}

// Always 6 rows of 7 days so the grid height never jumps between months
export function monthRange(date: CalendarDate): DateRange {
  const start = startOfWeek(startOfMonth(toDate(date)), { weekStartsOn: 1 })

  return { start, end: addDays(start, 42) }
}

export function rangeFor(view: CalendarView, date: CalendarDate): DateRange {
  if (view === 'month') {
    return monthRange(date)
  }

  return weekRange(date, view === 'day' ? 1 : 7)
}

export function eachDay({ start, end }: DateRange): Date[] {
  const days: Date[] = []
  for (let day = start; day < end; day = addDays(day, 1)) {
    days.push(day)
  }

  return days
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date)
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric' }).format(date)
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

export interface RangeTitle {
  months: string
  year: string
}

export function formatRangeTitle({ start, end }: DateRange): RangeTitle {
  const last = addDays(end, -1)
  const year = String(last.getFullYear())

  if (start.getMonth() === last.getMonth()) {
    return { months: new Intl.DateTimeFormat('en-US', { month: 'long' }).format(start), year }
  }

  const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short', ...(start.getFullYear() !== last.getFullYear() && { year: 'numeric' }) }).format(start)
  const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(last)

  return { months: `${startMonth} – ${endMonth}`, year }
}
