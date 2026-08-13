import { addDays, startOfDay } from 'date-fns'

interface EventOverlay {
  created: Record<string, CalendarEvent>
  updated: Record<string, CalendarEvent>
  deleted: string[]
}

interface QueuedRequest {
  method: 'POST' | 'PATCH' | 'DELETE'
  path: string
  body?: CalendarEvent
}

function eventsKey({ start, end }: DateRange): string {
  return `events-${start.getTime()}-${end.getTime()}`
}

function eventsQuery({ start, end }: DateRange) {
  return { start: start.toISOString(), end: end.toISOString() }
}

const _useCalendarEvents = () => {
  const { view, range, prevDate, nextDate } = useCalendar()
  const nuxtApp = useNuxtApp()
  const toast = useToast()

  const { data: calendars } = useFetch<Calendar[]>('/api/calendars', {
    key: 'calendars',
    default: () => [],
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
  })

  const hiddenCalendars = useCookie<string[]>('hidden-calendars', { default: () => [] })

  function toggleCalendar(id: string) {
    hiddenCalendars.value = hiddenCalendars.value.includes(id)
      ? hiddenCalendars.value.filter(hidden => hidden !== id)
      : [...hiddenCalendars.value, id]
  }

  // One cached fetch per visible range: revisiting a range renders instantly
  // from the payload cache instead of requesting again
  const { data: fetchedEvents, status } = useFetch<CalendarEvent[]>('/api/events', {
    key: () => eventsKey(range.value),
    query: computed(() => eventsQuery(range.value)),
    default: () => [],
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key]
  })

  // Warm the payload cache for the adjacent ranges so prev/next navigation
  // never waits on the network
  async function warmRange(range: DateRange) {
    const key = eventsKey(range)
    if (key in nuxtApp.payload.data) {
      return
    }

    try {
      nuxtApp.payload.data[key] = await $fetch<CalendarEvent[]>('/api/events', { query: eventsQuery(range) })
    } catch {
      // Warming is best-effort, navigation will fetch normally
    }
  }

  onNuxtReady(() => {
    watch(range, () => {
      // The month view streams events in chunks as it scrolls instead
      if (view.value === 'month') {
        return
      }

      warmRange(rangeFor(view.value, prevDate.value))
      warmRange(rangeFor(view.value, nextDate.value))
    }, { immediate: true })
  })

  // Extra ranges loaded on demand by the infinitely scrolling month view,
  // keyed the same way as the route fetch so the payload cache is shared
  const chunks = useState<Record<string, CalendarEvent[]>>('event-chunks', () => ({}))

  async function loadRange(range: DateRange) {
    const key = eventsKey(range)
    if (chunks.value[key]) {
      return
    }

    // Mark as in-flight so concurrent scroll events do not refetch
    chunks.value[key] = []

    try {
      chunks.value[key] = nuxtApp.payload.data[key] ?? await $fetch<CalendarEvent[]>('/api/events', { query: eventsQuery(range) })
    } catch {
      const { [key]: _failed, ...rest } = chunks.value
      chunks.value = rest
    }
  }

  // Local mutations are layered over whatever the server returns: the
  // in-memory store is per-instance on serverless, so a response may not
  // include a mutation another instance acknowledged
  const overlay = useState<EventOverlay>('event-overlay', () => ({ created: {}, updated: {}, deleted: [] }))

  // The merged pool is a superset, each view filters by its own days
  const events = computed<CalendarEvent[]>(() => {
    const merged = new Map<string, CalendarEvent>(fetchedEvents.value.map(event => [event.id, event]))

    for (const chunk of Object.values(chunks.value)) {
      for (const event of chunk) {
        merged.set(event.id, event)
      }
    }
    for (const event of Object.values(overlay.value.created)) {
      merged.set(event.id, event)
    }
    for (const event of Object.values(overlay.value.updated)) {
      merged.set(event.id, event)
    }
    for (const id of overlay.value.deleted) {
      merged.delete(id)
    }

    return [...merged.values()].filter(event => !hiddenCalendars.value.includes(event.calendarId))
  })

  // Every view renders a handful of days and used to scan the whole pool once
  // per day, which the month view makes expensive: it streams in a chunk per
  // six weeks scrolled and never drops one, so the pool keeps growing while
  // each new week row mounting rescans it. Bucketing once per change turns
  // those scans into seven lookups
  const eventsByDay = computed(() => {
    const buckets = new Map<string, CalendarEvent[]>()

    for (const event of events.value) {
      const end = new Date(event.end)

      // Ranges are [start, end), so an event ending at midnight stops on the
      // previous day and one with no duration still covers its own
      let day = startOfDay(new Date(event.start))
      do {
        const key = dayKey(day)
        const bucket = buckets.get(key)

        if (bucket) {
          bucket.push(event)
        } else {
          buckets.set(key, [event])
        }

        day = addDays(day, 1)
      } while (day < end)
    }

    return buckets
  })

  function eventsForDay(day: Date): CalendarEvent[] {
    return eventsByDay.value.get(dayKey(day)) ?? []
  }

  // Multi-day events land in every bucket they cover, so a span of days has to
  // deduplicate them
  function eventsForDays(days: Date[]): CalendarEvent[] {
    const seen = new Set<string>()

    return days.flatMap(day => eventsForDay(day).filter((event) => {
      if (seen.has(event.id)) {
        return false
      }

      seen.add(event.id)

      return true
    }))
  }

  // While offline, mutations stay in the overlay and queue for replay: the
  // upsert PATCH and idempotent DELETE make replaying in order safe
  const online = useOnline()
  const queue = useState<QueuedRequest[]>('event-queue', () => [])

  function send(request: QueuedRequest): Promise<unknown> {
    if (!online.value) {
      queue.value = [...queue.value, request]

      return Promise.resolve()
    }

    return $fetch(request.path, { method: request.method, body: request.body })
  }

  watch(online, async (isOnline) => {
    if (!isOnline || !queue.value.length) {
      return
    }

    const pending = queue.value
    queue.value = []

    for (const [index, request] of pending.entries()) {
      try {
        await $fetch(request.path, { method: request.method, body: request.body })
      } catch {
        queue.value = [...pending.slice(index), ...queue.value]
        toast.add({ title: 'Failed to sync offline changes', color: 'error' })

        return
      }
    }

    toast.add({ title: 'Offline changes synced', color: 'success' })
  })

  function mutate(apply: () => void, request: () => Promise<unknown>, message: string) {
    const snapshot = JSON.parse(JSON.stringify(overlay.value)) as EventOverlay

    apply()

    request().catch(() => {
      overlay.value = snapshot
      toast.add({ title: message, color: 'error' })
    })
  }

  function addEvent(event: CalendarEvent) {
    mutate(() => {
      overlay.value.created[event.id] = event
    }, () => send({ method: 'POST', path: '/api/events', body: event }), 'Failed to create event')
  }

  function updateEvent(event: CalendarEvent) {
    mutate(() => {
      if (overlay.value.created[event.id]) {
        overlay.value.created[event.id] = event
      } else {
        overlay.value.updated[event.id] = event
      }
    }, () => send({ method: 'PATCH', path: `/api/events/${event.id}`, body: event }), 'Failed to update event')
  }

  function removeEvent(id: string) {
    mutate(() => {
      const { [id]: _created, ...created } = overlay.value.created
      const { [id]: _updated, ...updated } = overlay.value.updated

      overlay.value = { created, updated, deleted: [...overlay.value.deleted, id] }
    }, () => send({ method: 'DELETE', path: `/api/events/${id}` }), 'Failed to delete event')
  }

  return {
    calendars,
    hiddenCalendars,
    toggleCalendar,
    events,
    eventsForDay,
    eventsForDays,
    status,
    online,
    queue,
    loadRange,
    warmRange,
    addEvent,
    updateEvent,
    removeEvent
  }
}

export const useCalendarEvents = createAppComposable(_useCalendarEvents)
