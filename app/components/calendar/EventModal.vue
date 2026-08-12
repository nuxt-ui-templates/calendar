<script setup lang="ts">
import { z } from 'zod'
import { addDays, addMinutes, startOfDay } from 'date-fns'
import type { FormSubmitEvent } from '@nuxt/ui'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  calendarId: z.string().min(1, 'Calendar is required'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string(),
  endTime: z.string(),
  allDay: z.boolean(),
  description: z.string().max(1000).optional()
}).refine(form => form.allDay || form.endTime > form.startTime, {
  message: 'End must be after start',
  path: ['endTime']
})

type FormSchema = z.output<typeof formSchema>

const { isEventModalOpen, editingEvent, eventDefaults } = useCalendar()
const { calendars, addEvent, updateEvent, removeEvent } = useCalendarEvents()

function toDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function initialState(): FormSchema {
  const event = editingEvent.value
  const start = event ? new Date(event.start) : eventDefaults.value?.start ?? addMinutes(startOfDay(new Date()), new Date().getHours() * 60 + 60)
  const end = event ? new Date(event.end) : eventDefaults.value?.end ?? addMinutes(start, 60)

  return {
    title: event?.title ?? '',
    calendarId: event?.calendarId ?? calendars.value[0]?.id ?? 'work',
    date: toDateInput(start),
    startTime: toTimeInput(start),
    endTime: toTimeInput(end),
    allDay: event?.allDay ?? eventDefaults.value?.allDay ?? false,
    description: event?.description ?? ''
  }
}

const state = ref<FormSchema>(initialState())

watch(isEventModalOpen, (open) => {
  if (open) {
    state.value = initialState()
  }
})

const calendarItems = computed(() => calendars.value.map(calendar => ({
  label: calendar.name,
  value: calendar.id,
  chip: { color: calendar.color }
})))

function onSubmit(form: FormSubmitEvent<FormSchema>) {
  const day = new Date(`${form.data.date}T00:00`)
  const start = form.data.allDay ? day : new Date(`${form.data.date}T${form.data.startTime}`)
  const end = form.data.allDay ? addDays(day, 1) : new Date(`${form.data.date}T${form.data.endTime}`)

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
    :title="editingEvent ? 'Edit event' : 'New event'"
    :ui="{ footer: 'justify-between' }"
  >
    <template #body>
      <UForm
        id="event-form"
        :schema="formSchema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField name="title">
          <UInput
            v-model="state.title"
            placeholder="Add a title"
            size="lg"
            variant="soft"
            autofocus
            class="w-full"
          />
        </UFormField>

        <div class="flex items-center gap-4">
          <UFormField
            label="Date"
            name="date"
          >
            <UInput
              v-model="state.date"
              type="date"
            />
          </UFormField>

          <template v-if="!state.allDay">
            <UFormField
              label="Start"
              name="startTime"
            >
              <UInput
                v-model="state.startTime"
                type="time"
              />
            </UFormField>

            <UFormField
              label="End"
              name="endTime"
            >
              <UInput
                v-model="state.endTime"
                type="time"
              />
            </UFormField>
          </template>
        </div>

        <USwitch
          v-model="state.allDay"
          label="All day"
        />

        <UFormField
          label="Calendar"
          name="calendarId"
        >
          <USelect
            v-model="state.calendarId"
            :items="calendarItems"
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
        :label="editingEvent ? 'Save' : 'Create'"
      />
    </template>
  </UModal>
</template>
