// Calendar colors are limited to the six Nuxt UI theme colors: the class maps
// in `calendars.ts` are generated statically at build time, so arbitrary hex
// values cannot work. The color from `/api/calendars` is the default, a user
// pick persisted in localStorage wins.
export const calendarLayerColors = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

export type CalendarLayerColor = typeof calendarLayerColors[number]

export const calendarLayerColorsKey = 'calendar-layer-colors'

export function isCalendarLayerColor(value: unknown): value is CalendarLayerColor {
  return (calendarLayerColors as readonly unknown[]).includes(value)
}

export function resolveCalendarLayerColor(defaultColor: CalendarLayerColor, override: unknown): CalendarLayerColor {
  return isCalendarLayerColor(override) ? override : defaultColor
}
