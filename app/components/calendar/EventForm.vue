<script setup lang="ts">
import { z } from 'zod'
import { addDays, subMilliseconds } from 'date-fns'
import { CalendarDate, Time } from '@internationalized/date'

// Both ends carry a date of their own, the way Apple Calendar states them:
// the span is edited from the end rather than riding along behind the start,
// and an end that has walked past midnight says so instead of being inferred.
// No `min(1)` on the title, an unnamed event is called what the ghost calls it
const formSchema = z.object({
  title: z.string().max(100),
  calendarId: z.string().min(1, 'Calendar is required'),
  startDate: z.instanceof(CalendarDate, { error: 'Start date is required' }),
  startTime: z.instanceof(Time, { error: 'Start time is required' }),
  endDate: z.instanceof(CalendarDate, { error: 'End date is required' }),
  endTime: z.instanceof(Time, { error: 'End time is required' }),
  allDay: z.boolean(),
  description: z.string().max(1000).optional()
}).refine(data => data.allDay
  ? data.endDate.compare(data.startDate) >= 0
  : toDateTime(data.endDate, data.endTime) > toDateTime(data.startDate, data.startTime), {
  error: 'Ends before it starts',
  path: ['endDate']
})

type FormSchema = z.output<typeof formSchema>

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
}>()

const { calendars } = useCalendarEvents()

function initialState(): FormSchema {
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
const state = shallowReactive<FormSchema>(initialState())

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

function range(data: FormSchema): { start: Date, end: Date } {
  if (data.allDay) {
    return { start: toDate(data.startDate), end: addDays(toDate(data.endDate), 1) }
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
    const { start, end } = range(state)

    // An end that has not caught up with the start covers no time at all, so
    // the last range that did stands until it does
    if (end <= start) {
      return
    }

    if (props.event) {
      queue({
        ...props.event,
        calendarId: state.calendarId,
        title: state.title || DEFAULT_TITLE,
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
  <UForm
    :schema="formSchema"
    :state="state"
    class="flex flex-col gap-2"
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
