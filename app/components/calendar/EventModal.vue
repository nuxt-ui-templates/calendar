<script setup lang="ts">
import { z } from 'zod'
import { addDays, addMinutes, startOfDay } from 'date-fns'
import { CalendarDate, Time } from '@internationalized/date'
import type { FormSubmitEvent } from '@nuxt/ui'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  calendarId: z.string().min(1, 'Calendar is required'),
  date: z.instanceof(CalendarDate, { error: 'Date is required' }),
  startTime: z.instanceof(Time, { error: 'Start is required' }),
  endTime: z.instanceof(Time, { error: 'End is required' }),
  allDay: z.boolean(),
  description: z.string().max(1000).optional()
}).refine(form => form.allDay || form.endTime.compare(form.startTime) > 0, {
  message: 'End must be after start',
  path: ['endTime']
})

type FormSchema = z.output<typeof formSchema>

const { isEventModalOpen, editingEvent, eventDefaults } = useCalendar()
const { calendars, addEvent, updateEvent, removeEvent } = useCalendarEvents()

function initialState(): FormSchema {
  const event = editingEvent.value
  const start = event ? new Date(event.start) : eventDefaults.value?.start ?? addMinutes(startOfDay(new Date()), new Date().getHours() * 60 + 60)
  const end = event ? new Date(event.end) : eventDefaults.value?.end ?? addMinutes(start, 60)

  return {
    title: event?.title ?? '',
    calendarId: event?.calendarId ?? calendars.value[0]?.id ?? 'work',
    date: toCalendarDate(start),
    startTime: toTime(start),
    endTime: toTime(end),
    allDay: event?.allDay ?? eventDefaults.value?.allDay ?? false,
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

function onSubmit(form: FormSubmitEvent<FormSchema>) {
  const day = toDate(form.data.date)
  const start = form.data.allDay ? day : toDateTime(form.data.date, form.data.startTime)
  const end = form.data.allDay ? addDays(day, 1) : toDateTime(form.data.date, form.data.endTime)

  const event: CalendarEvent = {
    id: editingEvent.value?.id ?? crypto.randomUUID(),
    calendarId: form.data.calendarId,
    title: form.data.title,
    description: form.data.description || undefined,
    start: start.toISOString(),
    end: end.toISOString(),
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

        <div class="flex items-center gap-4">
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

          <template v-if="!state.allDay">
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
            >
              <UInputTime
                v-model="state.endTime"
                :hour-cycle="24"
                color="neutral"
                variant="subtle"
              />
            </UFormField>
          </template>
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
