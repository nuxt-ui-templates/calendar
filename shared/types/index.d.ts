export type CalendarView = 'day' | 'week' | 'month'

export interface DateRange {
  start: Date
  end: Date
}

export interface Calendar {
  id: string
  name: string
  color: 'info' | 'success' | 'warning' | 'error' | 'primary' | 'secondary'
}

export interface CalendarEvent {
  id: string
  calendarId: string
  title: string
  description?: string
  start: string
  end: string
  allDay?: boolean
}
