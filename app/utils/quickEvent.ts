import { getLocalTimeZone } from '@internationalized/date'
import { addDays, addMinutes } from 'date-fns'

export interface QuickEvent {
  title: string
  start: Date
  end: Date
  allDay: boolean
}

// Words a title spends leading into its time, "Movie at 7pm", and would be
// left holding once the time is taken out
const CONNECTORS = new Set(['at', 'on', 'in', 'from', 'for', 'until', 'till', 'to', 'by', '@', '-', 'the', 'this', 'next', 'every', 'and'])

// The title is the phrase with the time cut out of it. `spans` says which
// characters the time was read from, so only the run leading into one sheds
// its connectors and a place after it keeps its own, "Dinner at 8 at Nobu"
function titleWithout(text: string, spans: { start: number, end: number }[]): string {
  const parts: string[] = []
  let cut = 0
  for (const span of spans) {
    parts.push(text.slice(cut, span.start))
    cut = span.end
  }
  parts.push(text.slice(cut))

  return parts
    .flatMap((part, index) => {
      const words = part.split(/\s+/).filter(Boolean)
      if (index < parts.length - 1) {
        while (words.length && CONNECTORS.has(words.at(-1)!.toLowerCase())) {
          words.pop()
        }
      }
      return words
    })
    .join(' ')
}

// Reads "Movie at 7pm on Friday" into a title and a time. Returns `null` for a
// phrase with no time in it, the caller picks one
export async function parseQuickEvent(text: string): Promise<QuickEvent | null> {
  const phrase = text.trim()
  if (!phrase) {
    return null
  }

  try {
    const { parse } = await import('gpu-time')

    const result = await parse(phrase, {
      reference: new Date().toISOString(),
      timeZone: getLocalTimeZone(),
      weekStart: 'MO' as const,
      limit: 1
    })

    const occurrence = result.occurrences[0]
    if (!occurrence) {
      return null
    }

    const start = new Date(occurrence.start)
    // A time with no end runs the hour a drawn draft does, a day with no
    // time is the whole of it
    const end = occurrence.end
      ? new Date(occurrence.end)
      : occurrence.allDay ? addDays(start, 1) : addMinutes(start, 60)

    return {
      title: titleWithout(phrase, result.spans),
      start,
      end,
      allDay: occurrence.allDay
    }
  } catch {
    // The model could not load or run here, the phrase still makes an event
    return null
  }
}
