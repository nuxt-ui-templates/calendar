<script setup lang="ts">
import { z } from 'zod'
import { addDays, addMinutes, differenceInCalendarDays, startOfDay, subMilliseconds } from 'date-fns'
import { CalendarDate, Time } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'

// No end-after-start refine: a timed end at or before the start means the
// event runs into the next day, which the End field says out loud below
const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  calendarId: z.string().min(1, 'Calendar is required'),
  date: z.instanceof(CalendarDate, { error: 'Date is required' }),
  startTime: z.instanceof(Time, { error: 'Start is required' }),
  endTime: z.instanceof(Time, { error: 'End is required' }),
  allDay: z.boolean(),
  description: z.string().max(1000).optional()
})

type FormSchema = z.output<typeof formSchema>

const { isEventModalOpen, editingEvent, eventDefaults } = useCalendar()
const { calendars, addEvent, updateEvent, removeEvent } = useCalendarEvents()

// The span an all-day event keeps through the form, in covered days: the
// modal edits the start day and the length rides along, since there is no
// end date field to shorten it with
const allDayDays = ref(1)

function initialState(): FormSchema {
  const event = editingEvent.value
  const start = event ? new Date(event.start) : eventDefaults.value?.start ?? addMinutes(startOfDay(new Date()), new Date().getHours() * 60 + 60)
  const end = event ? new Date(event.end) : eventDefaults.value?.end ?? addMinutes(start, 60)
  const allDay = event?.allDay ?? eventDefaults.value?.allDay ?? false

  // Ranges are [start, end), so the last covered day sits a tick before the
  // end: an all-day event ending at midnight has already stopped
  allDayDays.value = Math.max(1, differenceInCalendarDays(subMilliseconds(end, 1), start) + 1)

  return {
    title: event?.title ?? '',
    calendarId: event?.calendarId ?? calendars.value[0]?.id ?? 'work',
    date: toCalendarDate(start),
    // An all-day event carries no times of its own, so switching it to timed
    // starts from a sane hour instead of 00:00 – 00:00
    startTime: allDay ? new Time(9) : toTime(start),
    endTime: allDay ? new Time(10) : toTime(end),
    allDay,
    description: event?.description ?? ''
  }
}

// Shallow so the `CalendarDate` and `Time` instances are not wrapped in a
// reactive proxy, which would break their private fields
const state = shallowReactive<FormSchema>(initialState())

watch(isEventModalOpen, (open) => {
  if (open) {
    Object.assign(state, initialState())
  }
})

// The picker hangs off the date text rather than its own trailing button
const inputDate = useTemplateRef('inputDate')

const calendarItems = computed(() => calendars.value.map(calendar => ({
  label: calendar.name,
  value: calendar.id,
  chip: { color: calendar.color }
})))

// An end at or before the start means the event runs into the next day
const overnight = computed(() => !state.allDay && state.endTime.compare(state.startTime) <= 0)

function onSubmit(form: FormSubmitEvent<FormSchema>) {
  const day = toDate(form.data.date)
  const start = form.data.allDay ? day : toDateTime(form.data.date, form.data.startTime)
  const end = form.data.allDay
    ? addDays(day, allDayDays.value)
    : addDays(toDateTime(form.data.date, form.data.endTime), overnight.value ? 1 : 0)

  const event: CalendarEvent = {
    id: editingEvent.value?.id ?? crypto.randomUUID(),
    calendarId: form.data.calendarId,
    title: form.data.title,
    description: form.data.description || undefined,
    start: toLocalISO(start),
    end: toLocalISO(end),
    allDay: form.data.allDay || undefined
  }

  if (editingEvent.value) {
    updateEvent(event)
  } else {
    addEvent(event)
  }

  isEventModalOpen.value = false
}

function onRemove() {
  if (editingEvent.value) {
    removeEvent(editingEvent.value.id)
  }

  isEventModalOpen.value = false
}
</script>

<template>
  <UModal
    v-model:open="isEventModalOpen"
    :transition="false"
    :title="editingEvent ? 'Edit event' : 'New event'"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <UForm
        id="event-form"
        :schema="formSchema"
        :state="state"
        :validate-on="[]"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          name="title"
          label="Title"
        >
          <UInput
            v-model="state.title"
            placeholder="Add a title"
            color="neutral"
            variant="subtle"
            autofocus
            class="w-full"
          />
        </UFormField>

        <!-- The three of them only fit on one line from `sm` up, below that
          the times drop under the date rather than the end time alone -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-4">
          <UFormField
            label="Date"
            name="date"
          >
            <UInputDate
              ref="inputDate"
              v-model="state.date"
              color="neutral"
              variant="subtle"
            >
              <template #trailing>
                <UPopover :reference="inputDate?.inputsRef[3]?.$el">
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    icon="i-lucide-calendar"
                    aria-label="Select a date"
                    class="p-0 rounded-xs"
                  />

                  <template #content>
                    <UCalendar
                      v-model="state.date"
                      :week-starts-on="1"
                      class="p-2"
                    />
                  </template>
                </UPopover>
              </template>
            </UInputDate>
          </UFormField>

          <div
            v-if="!state.allDay"
            class="flex items-center gap-4"
          >
            <UFormField
              label="Start"
              name="startTime"
            >
              <UInputTime
                v-model="state.startTime"
                :hour-cycle="24"
                color="neutral"
                variant="subtle"
              />
            </UFormField>

            <UFormField
              label="End"
              name="endTime"
              :help="overnight ? 'Ends next day' : undefined"
            >
              <UInputTime
                v-model="state.endTime"
                :hour-cycle="24"
                color="neutral"
                variant="subtle"
              />
            </UFormField>
          </div>
        </div>

        <USwitch
          v-model="state.allDay"
          label="All day"
          color="neutral"
        />

        <UFormField
          label="Calendar"
          name="calendarId"
        >
          <USelect
            v-model="state.calendarId"
            :items="calendarItems"
            color="neutral"
            variant="subtle"
            class="w-48"
          />
        </UFormField>

        <UFormField
          label="Description"
          name="description"
        >
          <UTextarea
            v-model="state.description"
            placeholder="Add a description"
            color="neutral"
            variant="subtle"
            :rows="3"
            class="w-full"
          />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <UButton
        v-if="editingEvent"
        label="Delete"
        color="error"
        variant="soft"
        icon="i-lucide-trash-2"
        @click="onRemove"
      />
      <span v-else />

      <UButton
        type="submit"
        form="event-form"
        color="neutral"
        :label="editingEvent ? 'Save' : 'Create'"
      />
    </template>
  </UModal>
</template>
