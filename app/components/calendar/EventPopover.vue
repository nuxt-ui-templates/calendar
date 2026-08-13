<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'

const props = defineProps<{
  event: CalendarEvent
  disabled?: boolean
}>()

const { editEvent } = useCalendar()
const { calendars, removeEvent } = useCalendarEvents()

const calendar = computed(() => calendars.value.find(calendar => calendar.id === props.event.calendarId))

const time = computed(() => {
  const start = new Date(props.event.start)
  if (props.event.allDay) {
    return formatFullDate(start)
  }

  return `${formatFullDate(start)} ⋅ ${formatTime(start)} – ${formatTime(new Date(props.event.end))}`
})

const mounted = useMounted()

const open = ref(false)

function onUpdateOpen(value: boolean) {
  if (props.disabled) {
    return
  }

  open.value = value
}

function onEdit() {
  open.value = false
  editEvent(props.event)
}

function onRemove() {
  open.value = false
  removeEvent(props.event.id)
}

const items = computed<ContextMenuItem[]>(() => [{
  label: 'Edit',
  icon: 'i-lucide-pencil',
  onSelect: onEdit
}, {
  label: 'Delete',
  icon: 'i-lucide-trash-2',
  color: 'error',
  onSelect: onRemove
}])
</script>

<template>
  <!-- The popover only wraps the trigger after mount: its generated ids are
    not stable across the server/client boundary -->
  <slot v-if="!mounted" />

  <!-- `as-child` drops its handlers on a component that renders a fragment, so
    the two triggers need a real element between them. `contents` keeps it out
    of the layout, the trigger stays the event itself -->
  <UContextMenu
    v-else
    :items="items"
    :disabled="disabled"
  >
    <div class="contents">
      <UPopover
        :open="open"
        :ui="{ content: 'flex flex-col gap-1 p-4 w-72' }"
        @update:open="onUpdateOpen"
      >
        <slot />

        <template #content>
          <div class="flex items-start justify-between gap-2">
            <p class="font-semibold text-highlighted">
              {{ event.title }}
            </p>

            <div class="flex -mt-1.5 -me-1.5">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Edit event"
                @click="onEdit"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Delete event"
                @click="onRemove"
              />
            </div>

            <p class="text-sm text-muted">
              {{ time }}
            </p>

            <p
              v-if="event.description"
              class="text-sm text-default"
            >
              {{ event.description }}
            </p>

            <UBadge
              :label="calendar?.name"
              :color="calendar?.color"
              variant="subtle"
              size="sm"
              class="self-start mt-1"
            />
          </div>
        </template>
      </UPopover>
    </div>
  </UContextMenu>
</template>
