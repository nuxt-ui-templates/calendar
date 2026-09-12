import { getLocalTimeZone } from '@internationalized/date'
import { addDays, addMinutes } from 'date-fns'

export interface QuickEvent {
  title: string
  start: Date
  end: Date
  allDay: boolean
}

type Parsed = Awaited<ReturnType<typeof import('gpu-time')['parse']>>

// Words a title spends leading into its time, "Movie at 7pm", and would be
// left holding once the time is taken out
const CONNECTORS = new Set(['at', 'on', 'in', 'from', 'for', 'until', 'till', 'to', 'by', '@', '-', 'the', 'this', 'next', 'every', 'and'])

// What a phrase resolves to, so two phrases can be told to mean the same time
function signature(result: Parsed): string {
  return JSON.stringify([result.occurrences, result.rrules])
}

function silent(result: Parsed): boolean {
  return !result.occurrences.length && !result.rrules.length
}

// Reads "Movie at 7pm on Friday" into a title and a time. `gpu-time` says
// when the phrase happens but not which words said so, and the title is the
// rest of the phrase: the fewest words that still resolve to the same time
// are the time, provided what is left around them says no time of its own,
// or "tomorrow at 9" would be titled "tomorrow" on the strength of "9" alone
// resolving the same way until 9am has passed. Trimmed from the front and
// then from the back, a location after the time survives, "Dinner at 8 at
// Nobu". Returns `null` for a phrase with no time in it, the caller picks one
export async function parseQuickEvent(text: string): Promise<QuickEvent | null> {
  const phrase = text.trim()
  if (!phrase) {
    return null
  }

  try {
    const { parse, parseMany } = await import('gpu-time')

    const context = {
      reference: new Date().toISOString(),
      timeZone: getLocalTimeZone(),
      weekStart: 'MO' as const,
      limit: 1
    }

    const base = await parse(phrase, context)
    const occurrence = base.occurrences[0]
    if (!occurrence) {
      return null
    }

    const expected = signature(base)
    const words = phrase.split(/\s+/)

    // The most words the front can spare: every candidate goes through the
    // model in a single batch and the longest lead-in that holds is taken
    const heads = words.slice(1).flatMap((_, index) => [
      words.slice(0, index + 1).join(' '),
      words.slice(index + 1).join(' ')
    ])
    const headResults = await parseMany(heads, context)

    let leading = 0
    for (let count = words.length - 1; count >= 1; count--) {
      if (silent(headResults[(count - 1) * 2]!) && signature(headResults[(count - 1) * 2 + 1]!) === expected) {
        leading = count
        break
      }
    }

    const prefix = words.slice(0, leading)
    const core = words.slice(leading)

    // Then the back, with the lead-in kept in the remainder being tested so
    // the two halves are known to say nothing together either
    const tails = core.slice(1).flatMap((_, index) => [
      [...prefix, ...core.slice(core.length - index - 1)].join(' '),
      core.slice(0, core.length - index - 1).join(' ')
    ])
    const tailResults = tails.length ? await parseMany(tails, context) : []

    let trailing = 0
    for (let count = core.length - 1; count >= 1; count--) {
      if (silent(tailResults[(count - 1) * 2]!) && signature(tailResults[(count - 1) * 2 + 1]!) === expected) {
        trailing = count
        break
      }
    }

    const suffix = core.slice(core.length - trailing)

    while (prefix.length && CONNECTORS.has(prefix.at(-1)!.toLowerCase())) {
      prefix.pop()
    }

    const start = new Date(occurrence.start)
    // A time with no end runs the hour a drawn draft does, a day with no
    // time is the whole of it
    const end = occurrence.end
      ? new Date(occurrence.end)
      : occurrence.allDay ? addDays(start, 1) : addMinutes(start, 60)

    return {
      title: [...prefix, ...suffix].join(' '),
      start,
      end,
      allDay: occurrence.allDay
    }
  } catch {
    // The model could not load or run here, the phrase still makes an event
    return null
  }
}
