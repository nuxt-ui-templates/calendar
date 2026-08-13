import type { H3Event } from 'h3'
import { addDays, addMinutes, addWeeks, set, startOfWeek } from 'date-fns'

interface Store {
  calendars: Calendar[]
  events: Map<string, CalendarEvent>
}

const calendars: Calendar[] = [
  { id: 'work', name: 'Work', color: 'info' },
  { id: 'personal', name: 'Personal', color: 'success' },
  { id: 'side-project', name: 'Side project', color: 'warning' }
]

function at(day: Date, hours: number, minutes = 0): Date {
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 })
}

function timed(id: string, calendarId: string, title: string, start: Date, durationMinutes: number, description?: string): CalendarEvent {
  return {
    id,
    calendarId,
    title,
    description,
    start: start.toISOString(),
    end: addMinutes(start, durationMinutes).toISOString()
  }
}

function allDay(id: string, calendarId: string, title: string, start: Date, days = 1, description?: string): CalendarEvent {
  return {
    id,
    calendarId,
    title,
    description,
    start: at(start, 0).toISOString(),
    end: at(addDays(start, days), 0).toISOString(),
    allDay: true
  }
}

// A year either way so scrolling in any direction stays populated
const WEEKS_AROUND = 52

// Stable pseudo-random in [0, 1) for a given week and event, so the same
// calendar is generated on every boot and no two weeks look alike
function chance(week: number, key: string): number {
  let hash = week * 31

  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }

  const value = Math.sin(hash) * 10000

  return value - Math.floor(value)
}

// Deterministic seed relative to now so the demo is always populated,
// same trick as the dashboard template's notifications endpoint
function seed(): Map<string, CalendarEvent> {
  const events: CalendarEvent[] = []
  const now = new Date()
  const currentWeek = startOfWeek(now, { weekStartsOn: 1 })

  for (let offset = -WEEKS_AROUND; offset <= WEEKS_AROUND; offset++) {
    const week = addWeeks(currentWeek, offset)
    const id = (name: string) => `seed-${offset}-${name}`
    const [mon, tue, wed, thu, fri, sat, sun] = eachDayOfWeek(week)

    // The weekly rhythm, everything below it varies
    for (const [index, day] of [mon, tue, wed, thu, fri].entries()) {
      events.push(timed(id(`standup-${index}`), 'work', 'Daily stand-up', at(day!, 9, 15), 15))
    }

    events.push(
      timed(id('one-on-one'), 'work', '1:1 with Sam', at(thu!, 11), 30),
      timed(id('ship'), 'side-project', 'Ship weekly update', at(fri!, 17), 30),
      timed(id('run'), 'personal', 'Long run', at(sat!, 9), 60)
    )

    // Sprints run fortnightly, so planning and retro come in pairs
    if (offset % 2 === 0) {
      events.push(
        timed(id('planning'), 'work', 'Sprint planning', at(mon!, 10), 90, 'Plan the sprint with the team.'),
        timed(id('retro'), 'work', 'Sprint retro', at(fri!, 16), 45)
      )
    }

    // Drawn per week so the calendar has quiet stretches and busy ones
    // instead of the same grid repeated
    const optional: [string, number, CalendarEvent][] = [
      ['design-review', 0.5, timed(id('design-review'), 'work', 'Design review', at(tue!, 14), 60)],
      ['pairing', 0.4, timed(id('pairing'), 'work', 'Pair on API caching', at(wed!, 10), 120)],
      ['roadmap', 0.25, timed(id('roadmap'), 'work', 'Roadmap review', at(wed!, 15), 60)],
      ['interview', 0.2, timed(id('interview'), 'work', 'Interview', at(tue!, 11), 45)],
      ['gym-1', 0.7, timed(id('gym-1'), 'personal', 'Gym', at(tue!, 7), 60)],
      ['gym-2', 0.7, timed(id('gym-2'), 'personal', 'Gym', at(thu!, 7), 60)],
      ['lunch', 0.3, timed(id('lunch'), 'personal', 'Lunch with Alex', at(thu!, 12, 30), 60)],
      ['dinner', 0.3, timed(id('dinner'), 'personal', 'Dinner with friends', at(fri!, 19, 30), 150)],
      ['market', 0.35, timed(id('market'), 'personal', 'Farmers market', at(sat!, 10, 30), 60)],
      ['plants', 0.5, timed(id('plants'), 'personal', 'Water plants', at(sun!, 10), 15)],
      ['focus-1', 0.5, timed(id('focus-1'), 'side-project', 'Focus time', at(tue!, 20), 120, 'Deep work on the side project.')],
      ['focus-2', 0.4, timed(id('focus-2'), 'side-project', 'Focus time', at(thu!, 20), 120)],
      ['offsite', 0.07, allDay(id('offsite'), 'work', 'Team offsite', wed!, 2)],
      ['launch', 0.06, allDay(id('launch'), 'side-project', 'Launch day', thu!)],
      ['holiday', 0.05, allDay(id('holiday'), 'personal', 'Time off', mon!, 5, 'Out of office, back next week.')]
    ]

    for (const [key, probability, event] of optional) {
      if (chance(offset, key) < probability) {
        events.push(event)
      }
    }
  }

  // Overlapping events on "today" so the layout algorithm is visibly exercised
  events.push(
    timed('seed-today-focus', 'side-project', 'Focus time', at(now, 9), 120),
    timed('seed-today-review', 'work', 'Code review', at(now, 9, 30), 60),
    timed('seed-today-coffee', 'personal', 'Coffee chat', at(now, 10), 45),
    timed('seed-today-brief', 'work', 'Product brief', at(now, 13), 60),
    timed('seed-today-sync', 'work', 'Marketing sync', at(now, 13, 45), 75)
  )

  // Anchored near today so the all-day row is always part of the demo
  events.push(
    allDay('seed-conference', 'work', 'Nuxt Conf', addDays(addWeeks(currentWeek, 1), 1), 3, 'Three days of talks and workshops.'),
    allDay('seed-birthday', 'personal', 'Anna\'s birthday', addDays(currentWeek, 5))
  )

  return new Map(events.map(event => [event.id, event]))
}

function eachDayOfWeek(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

// The demo is public and unauthenticated, so a single shared store would let
// anyone edit the calendar everyone else sees. Each visitor gets their own copy
// instead, forked from the seed the first time they change something.
const SESSION_COOKIE = 'calendar-session'

// Sessions live in memory, so the ceiling only has to hold for one instance
const MAX_SESSIONS = 100

const sessions = new Map<string, Store>()

let base: Store | undefined

// Everyone starts from the same calendar, so visitors who only ever read it
// share this one and cost nothing
function useBaseStore(): Store {
  base ??= { calendars, events: seed() }

  return base
}

// Re-inserting keeps the Map ordered least to most recently used, so eviction
// always drops the coldest session
function touch(id: string, session: Store): Store {
  sessions.delete(id)
  sessions.set(id, session)

  return session
}

export function useStore(event: H3Event): Store {
  const id = getCookie(event, SESSION_COOKIE)
  const session = id && sessions.get(id)

  return session ? touch(id, session) : useBaseStore()
}

// Used by the write handlers: forking on the first mutation keeps the cookie
// off read requests, where the server rendered response could not return it
export function useEditableStore(event: H3Event): Store {
  const cookie = getCookie(event, SESSION_COOKIE)
  const session = cookie && sessions.get(cookie)

  if (session) {
    return touch(cookie, session)
  }

  const id = cookie || crypto.randomUUID()

  setCookie(event, SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    maxAge: 60 * 60 * 24
  })

  // Events are replaced rather than mutated, so the fork copies the lookup
  // and not the events themselves
  const forked: Store = { calendars, events: new Map(useBaseStore().events) }

  sessions.set(id, forked)

  if (sessions.size > MAX_SESSIONS) {
    sessions.delete(sessions.keys().next().value!)
  }

  return forked
}
