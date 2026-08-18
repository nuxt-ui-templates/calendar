<script setup lang="ts">
import { z } from 'zod'
import { addDays, subMilliseconds } from 'date-fns'
import { CalendarDate, Time } from '@internationalized/date'

// One request per pause rather than one per keystroke. The popover unmounts
// the form when it closes, which flushes whatever is still waiting
const SAVE_DELAY = 200

// An event to edit, or the draft being drawn on the grid. The form owns
// neither: it hands back what changed and the caller decides what that means
const props = defineProps<{
  event?: CalendarEvent
  draft?: EventDraft
}>()

const emit = defineEmits<{
  update: [patch: Partial<EventDraft>]
  save: [event: CalendarEvent]
  remove: [id: string]
  escape: []
}>()

const { calendars } = useCalendarEvents()

// The form only mounts while its popover is open, so it is what tells
// `useEventEditor` the event still has somewhere to be edited
if (props.event) {
  useEventEditor().registerAnchor()
}

// Both ends carry a date of their own, the way Apple Calendar states them:
// the span is edited from the end rather than riding along behind the start,
// and an end that has walked past midnight says so instead of being inferred.
// An event keeps its name, clearing the field is a slip rather than a rename;
// a draft has none yet and takes the one its ghost is showing
const formSchema = z.object({
  title: props.event ? z.string().min(1, 'Title is required').max(100) : z.string().max(100),
  calendarId: z.string().min(1, 'Calendar is required'),
  startDate: z.instanceof(CalendarDate, { error: 'Start date is required' }),
  startTime: z.instanceof(Time, { error: 'Start time is required' }),
  endDate: z.instanceof(CalendarDate, { error: 'End date is required' }),
  endTime: z.instanceof(Time, { error: 'End time is required' }),
  allDay: z.boolean(),
  description: z.string().max(1000).optional()
}).refine(data => !data.startDate || !data.endDate || (data.allDay
  ? data.endDate.compare(data.startDate) >= 0
  : toDateTime(data.endDate, data.endTime) > toDateTime(data.startDate, data.startTime)), {
  error: 'Ends before it starts',
  path: ['endDate']
})

type FormSchema = z.output<typeof formSchema>

// Backspacing a date or a time segment down to nothing clears the whole value,
// which is what the two `required` messages above are for. The state has to be
// able to hold that gap while it is on screen
type FormState = Omit<FormSchema, 'startDate' | 'startTime' | 'endDate' | 'endTime'>
  & Partial<Pick<FormSchema, 'startDate' | 'startTime' | 'endDate' | 'endTime'>>

function initialState(): FormState {
  const source = props.event ?? props.draft
  const start = props.event ? new Date(props.event.start) : props.draft!.start
  const end = props.event ? new Date(props.event.end) : props.draft!.end
  const allDay = source?.allDay ?? false

  return {
    title: source?.title ?? '',
    calendarId: source?.calendarId ?? calendars.value[0]?.id ?? 'work',
    startDate: toCalendarDate(start),
    // Ranges are [start, end), so the last day an all-day event covers sits a
    // tick before the end: one ending at midnight has already stopped
    endDate: toCalendarDate(allDay ? subMilliseconds(end, 1) : end),
    // An all-day event carries no times of its own, so switching it to timed
    // starts from a sane hour instead of 00:00 – 00:00
    startTime: allDay ? new Time(9) : toTime(start),
    endTime: allDay ? new Time(10) : toTime(end),
    allDay,
    description: source?.description ?? ''
  }
}

// Shallow so the `CalendarDate` and `Time` instances are not wrapped in a
// reactive proxy, which would break their private fields
const state = shallowReactive<FormState>(initialState())

// The pickers hang off the date text rather than a trailing button of their own
const startsDate = useTemplateRef('startsDate')
const endsDate = useTemplateRef('endsDate')

const calendarItems = computed(() => calendars.value.map(calendar => ({
  label: calendar.name,
  value: calendar.id,
  chip: { color: calendar.color }
})))

// The calendar reads as its colour alone, the way Apple Calendar puts it next
// to the title rather than spelling the name out
const color = computed(() => calendars.value.find(calendar => calendar.id === state.calendarId)?.color ?? 'primary')

// `null` while a segment is empty: `toDate` throws on a missing date and
// `toDateTime` quietly reads a missing time as midnight, and neither is
// something to save an event from
function range(data: FormState): { start: Date, end: Date } | null {
  if (!data.startDate || !data.endDate) {
    return null
  }

  if (data.allDay) {
    return { start: toDate(data.startDate), end: addDays(toDate(data.endDate), 1) }
  }

  if (!data.startTime || !data.endTime) {
    return null
  }

  return { start: toDateTime(data.startDate, data.startTime), end: toDateTime(data.endDate, data.endTime) }
}

let timer: ReturnType<typeof setTimeout> | undefined
let pending: CalendarEvent | null = null

function flush() {
  clearTimeout(timer)

  if (pending) {
    emit('save', pending)
    pending = null
  }
}

function queue(event: CalendarEvent) {
  pending = event
  clearTimeout(timer)
  timer = setTimeout(flush, SAVE_DELAY)
}

// The last edit is still waiting when the popover takes the form down with it
onBeforeUnmount(flush)

// There is nothing to submit: an edit lands on the event as it is made, and a
// draft walks its ghost to where it would end up
watch(
  () => [state.title, state.calendarId, state.description, state.allDay, state.startDate, state.startTime, state.endDate, state.endTime],
  () => {
    const period = range(state)

    // A span still being typed covers no time at all, so the last one that did
    // stands until it does
    if (!period || period.end <= period.start) {
      return
    }

    const { start, end } = period

    if (props.event) {
      queue({
        ...props.event,
        calendarId: state.calendarId,
        // Mid-retype the field is empty for a keystroke or two. The event
        // holds the name it had rather than losing it, and rather than holding
        // back everything else typed in the meantime
        title: state.title.trim() ? state.title : props.event.title,
        description: state.description || undefined,
        start: toLocalISO(start),
        end: toLocalISO(end),
        allDay: state.allDay || undefined
      })

      return
    }

    emit('update', {
      title: state.title,
      calendarId: state.calendarId,
      description: state.description,
      allDay: state.allDay,
      start,
      end
    })
  }
)
</script>

<template>
  <!-- Apple Calendar's inspector: rounded groups on the popover surface, each
    field a line of plain text until it is focused, no labels and no boxes -->
  <!-- The date and time segments swallow every key but Tab, Escape included,
    so the popover never hears the one that should close it. Caught on the way
    down instead, before a segment can take it. The pickers hang their content
    off the body, so their own Escape never comes through here -->
  <UForm
    :schema="formSchema"
    :state="state"
    class="flex flex-col gap-2"
    @keydown.escape.capture.stop="emit('escape')"
  >
    <div class="flex items-center px-3 py-2 rounded-md bg-(--control-bg)">
      <UFormField
        name="title"
        class="flex-1 min-w-0"
      >
        <UInput
          v-model="state.title"
          :placeholder="DEFAULT_TITLE"
          autofocus
          variant="none"
          :maxlength="100"
          class="w-full"
          :ui="{ base: 'ps-0 py-0 rounded-none', trailing: 'pe-0' }"
        >
          <template #trailing>
            <!-- The calendar is its colour and nothing else, the swatch Apple
          Calendar puts at the end of the title line -->
            <USelect
              v-model="state.calendarId"
              :items="calendarItems"
              color="neutral"
              variant="soft"
              size="sm"
              trailing-icon="i-lucide-chevrons-up-down"
              aria-label="Calendar"
              class="-me-2"
              :content="{ position: 'item-aligned', align: 'start' }"
              :ui="{ base: 'rounded-sm', content: 'min-w-fit', itemLeadingChipSize: 'md' }"
            >
              <template #leading>
                <span
                  class="block size-2 m-1 rounded-full"
                  :class="calendarDotClasses[color]"
                />
              </template>
            </USelect>
          </template>
        </UInput>
      </UFormField>
    </div>

    <!-- The inspector's own shape: a label column stating each field,
      the value beside it as text until it is focused -->
    <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1.5 px-3 py-2 rounded-md bg-(--control-bg)">
      <span class="text-sm text-muted text-end w-16">All Day:</span>
      <UCheckbox
        v-model="state.allDay"
        color="neutral"
        aria-label="All day"
        class="justify-self-start"
      />

      <span class="text-sm text-muted text-end w-16">Starts:</span>
      <div class="flex items-center">
        <UInputDate
          ref="startsDate"
          v-model="state.startDate"
          variant="none"
          :ui="{ base: 'ps-0 py-0' }"
        >
          <template #trailing>
            <UPopover :reference="startsDate?.inputsRef[3]?.$el">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-calendar"
                aria-label="Select a start date"
                class="rounded-xs p-0.5"
              />

              <template #content>
                <UCalendar
                  v-model="state.startDate"
                  :week-starts-on="1"
                  class="p-2"
                />
              </template>
            </UPopover>
          </template>
        </UInputDate>

        <UInputTime
          v-if="!state.allDay"
          v-model="state.startTime"
          variant="none"
          :hour-cycle="24"
          aria-label="Start time"
          :ui="{ base: 'p-0' }"
        />
      </div>

      <span class="text-sm text-muted text-end w-16">Ends:</span>
      <UFormField name="endDate">
        <div class="flex items-center">
          <UInputDate
            ref="endsDate"
            v-model="state.endDate"
            variant="none"
            :ui="{ base: 'ps-0 py-0' }"
          >
            <template #trailing>
              <UPopover :reference="endsDate?.inputsRef[3]?.$el">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-calendar"
                  aria-label="Select an end date"
                  class="rounded-xs p-0.5"
                />

                <template #content>
                  <UCalendar
                    v-model="state.endDate"
                    :week-starts-on="1"
                    class="p-2"
                  />
                </template>
              </UPopover>
            </template>
          </UInputDate>

          <UInputTime
            v-if="!state.allDay"
            v-model="state.endTime"
            variant="none"
            :hour-cycle="24"
            aria-label="End time"
            :ui="{ base: 'p-0' }"
          />
        </div>
      </UFormField>
    </div>

    <div class="px-3 py-2 rounded-md bg-(--control-bg)">
      <UFormField name="description">
        <UTextarea
          v-model="state.description"
          placeholder="Add Notes"
          variant="none"
          :maxlength="1000"
          :rows="2"
          autoresize
          :maxrows="6"
          class="w-full"
          :ui="{ base: 'p-0 resize-none rounded-none' }"
        />
      </UFormField>
    </div>

    <UButton
      v-if="event"
      icon="i-lucide-trash-2"
      label="Delete Event"
      color="error"
      variant="soft"
      size="sm"
      block
      @click="emit('remove', event.id)"
    />
  </UForm>
</template>
