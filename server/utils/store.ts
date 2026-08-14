import type { H3Event } from 'h3'
import { addDays, addMinutes, addWeeks, set, startOfWeek } from 'date-fns'

// What the handlers need from an event collection, so a session can stand in
// for the seeded Map with a copy-on-write view
interface EventSource {
  set(id: string, event: CalendarEvent): void
  delete(id: string): void
  values(): Iterable<CalendarEvent>
}

interface Store {
  calendars: Calendar[]
  events: EventSource
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
    start: toLocalISO(start),
    end: toLocalISO(addMinutes(start, durationMinutes))
  }
}

function allDay(id: string, calendarId: string, title: string, start: Date, days = 1, description?: string): CalendarEvent {
  return {
    id,
    calendarId,
    title,
    description,
    start: toLocalISO(at(start, 0)),
    end: toLocalISO(at(addDays(start, days), 0)),
    allDay: true
  }
}

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

// Deterministic pick for a given week and key, so a drawn event varies its
// day, hour or title from week to week without losing the stable seed
function pick<T>(week: number, key: string, options: T[]): T {
  return options[Math.floor(chance(week, key) * options.length)]!
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
      timed(id('run'), 'personal', 'Long run', at(pick(offset, 'run-day', [sat!, sun!]), pick(offset, 'run-time', [8, 9])), 60)
    )

    // Sprints run fortnightly, so planning and retro come in pairs
    if (offset % 2 === 0) {
      events.push(
        timed(id('planning'), 'work', 'Sprint planning', at(mon!, 10), 90, 'Plan the sprint with the team.'),
        timed(id('retro'), 'work', 'Sprint retro', at(fri!, 16), 45)
      )
    }

    // Drawn per week, each picking its own day, hour or title per week too,
    // so the calendar has quiet stretches, busy ones and no two months alike.
    // Closures so an event that does not come up is never built
    const optional: [string, number, () => CalendarEvent][] = [
      ['design-review', 0.5, () => timed(id('design-review'), 'work', 'Design review', at(pick(offset, 'design-review-day', [tue!, wed!]), 14), 60)],
      ['pairing', 0.4, () => timed(id('pairing'), 'work', 'Pair on API caching', at(pick(offset, 'pairing-day', [wed!, thu!]), pick(offset, 'pairing-time', [10, 14])), 120)],
      ['roadmap', 0.25, () => timed(id('roadmap'), 'work', 'Roadmap review', at(wed!, 15), 60)],
      ['interview', 0.2, () => timed(id('interview'), 'work', 'Interview', at(pick(offset, 'interview-day', [tue!, fri!]), 11), 45)],
      ['gym-1', 0.7, () => timed(id('gym-1'), 'personal', 'Gym', at(tue!, pick(offset, 'gym-1-time', [7, 18])), 60)],
      ['gym-2', 0.7, () => timed(id('gym-2'), 'personal', 'Gym', at(thu!, pick(offset, 'gym-2-time', [7, 18])), 60)],
      ['lunch', 0.35, () => timed(id('lunch'), 'personal', pick(offset, 'lunch-title', ['Lunch with Alex', 'Lunch with Maria', 'Team lunch']), at(pick(offset, 'lunch-day', [tue!, thu!]), 12, 30), 60)],
      ['dinner', 0.35, () => timed(id('dinner'), 'personal', pick(offset, 'dinner-title', ['Dinner with friends', 'Date night', 'Team dinner']), at(pick(offset, 'dinner-day', [fri!, sat!]), 19, 30), 150)],
      ['market', 0.35, () => timed(id('market'), 'personal', 'Farmers market', at(pick(offset, 'market-day', [sat!, sun!]), 10, 30), 60)],
      ['plants', 0.5, () => timed(id('plants'), 'personal', 'Water plants', at(sun!, 10), 15)],
      ['errand', 0.25, () => timed(id('errand'), 'personal', pick(offset, 'errand-title', ['Dentist', 'Haircut', 'Car service', 'Pick up package']), at(pick(offset, 'errand-day', [mon!, wed!, sat!]), pick(offset, 'errand-time', [9, 16, 17])), 45)],
      ['evening-out', 0.2, () => timed(id('evening-out'), 'personal', pick(offset, 'evening-out-title', ['Concert', 'Movie night', 'Board games']), at(pick(offset, 'evening-out-day', [thu!, fri!, sat!]), 20), 180)],
      ['focus-1', 0.5, () => timed(id('focus-1'), 'side-project', 'Focus time', at(pick(offset, 'focus-1-day', [mon!, tue!]), 20), 120, 'Deep work on the side project.')],
      ['focus-2', 0.4, () => timed(id('focus-2'), 'side-project', 'Focus time', at(pick(offset, 'focus-2-day', [wed!, thu!]), 20), 120)],
      ['stream', 0.15, () => timed(id('stream'), 'side-project', 'Live stream', at(pick(offset, 'stream-day', [tue!, wed!]), 18), 90)],
      ['offsite', 0.07, () => allDay(id('offsite'), 'work', 'Team offsite', pick(offset, 'offsite-day', [tue!, wed!]), 2)],
      ['launch', 0.06, () => allDay(id('launch'), 'side-project', 'Launch day', thu!)],
      ['holiday', 0.05, () => allDay(id('holiday'), 'personal', 'Time off', mon!, 5, 'Out of office, back next week.')]
    ]

    for (const [key, probability, make] of optional) {
      if (chance(offset, key) < probability) {
        events.push(make())
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

let seeded: Map<string, CalendarEvent> | undefined

// Seeded once per instance on purpose: the ids are relative to the week of
// the seed, so re-seeding a live instance would silently move their meaning
// under clients that already cached them. Serverless instances recycle often
// enough to keep "today" fresh
function seedEvents(): Map<string, CalendarEvent> {
  return seeded ??= seed()
}

let base: Store | undefined

// Everyone starts from the same calendar, so visitors who only ever read it
// share this one and cost nothing
function useBaseStore(): Store {
  return base ??= { calendars, events: seedEvents() }
}

// Copy-on-write fork: a session records only its own changes and reads
// through to the shared seed, so a visitor who edits one event costs one
// entry instead of a copy of the whole store. `null` marks a deletion
function forkEvents(base: Map<string, CalendarEvent>): EventSource {
  const changes = new Map<string, CalendarEvent | null>()

  return {
    set(id, event) {
      changes.set(id, event)
    },
    delete(id) {
      changes.set(id, null)
    },
    * values() {
      for (const [id, event] of base) {
        const change = changes.get(id)

        if (change) {
          yield change
        } else if (!changes.has(id)) {
          yield event
        }
      }

      for (const [id, change] of changes) {
        if (change && !base.has(id)) {
          yield change
        }
      }
    }
  }
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

  const forked: Store = { calendars, events: forkEvents(seedEvents()) }

  sessions.set(id, forked)

  if (sessions.size > MAX_SESSIONS) {
    sessions.delete(sessions.keys().next().value!)
  }

  return forked
}
