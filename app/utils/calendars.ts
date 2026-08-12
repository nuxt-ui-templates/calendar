// Static class maps so Tailwind sees the full class names at build time
export const eventBlockClasses: Record<Calendar['color'], string> = {
  primary: 'bg-primary/15 hover:bg-primary/25 text-primary border-primary',
  secondary: 'bg-secondary/15 hover:bg-secondary/25 text-secondary border-secondary',
  info: 'bg-info/15 hover:bg-info/25 text-info border-info',
  success: 'bg-success/15 hover:bg-success/25 text-success border-success',
  warning: 'bg-warning/15 hover:bg-warning/25 text-warning border-warning',
  error: 'bg-error/15 hover:bg-error/25 text-error border-error'
}

export const calendarDotClasses: Record<Calendar['color'], string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error'
}
