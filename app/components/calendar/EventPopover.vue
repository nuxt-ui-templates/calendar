<script setup lang="ts">
import { addDays } from 'date-fns'
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
    // The end is the first excluded midnight, so the last covered day is the
    // one before it
    const last = addDays(new Date(props.event.end), -1)

    return last > start ? `${formatFullDate(start)} – ${formatFullDate(last)}` : formatFullDate(start)
  }

  return `${formatFullDate(start)} ⋅ ${formatTime(start)} – ${formatTime(new Date(props.event.end))}`
})

// A popover and a context menu each are what an event costs to render, and the
// month view puts a few hundred of them on screen at once. Neither is worth
// anything until an event is actually pointed at, so they mount on the first
// interaction that could reach them, all of which come before it can open one.
// Starting out unarmed also keeps their generated ids off the server render,
// where they are not stable across the boundary
const armed = ref(false)

const root = useTemplateRef('root')

function arm(event: Event) {
  if (armed.value) {
    return
  }

  armed.value = true

  // Arming swaps the event out for the wrapped copy, so a keyboard user
  // tabbing onto it has to be handed the one taking its place
  if (event.type === 'focusin') {
    nextTick(() => root.value?.querySelector<HTMLElement>('[data-event]')?.focus())
  }
}

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
  <!-- Held across the swap so the focus has somewhere to go back to. `contents`
    keeps it out of the layout, on both this one and the one below -->
  <div
    ref="root"
    class="contents"
    @pointerover="arm"
    @focusin="arm"
    @contextmenu="arm"
  >
    <slot v-if="!armed" />

    <!-- `as-child` drops its handlers on a component that renders a fragment,
      so the two triggers need a real element between them, and the trigger
      stays the event itself -->
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

              <UTheme :props="{ button: { color: 'neutral', variant: 'ghost', size: 'sm' } }">
                <div class="flex -mt-1.5 -me-1.5">
                  <UButton
                    icon="i-lucide-pencil"
                    aria-label="Edit event"
                    @click="onEdit"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="Delete event"
                    @click="onRemove"
                  />
                </div>
              </UTheme>
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
          </template>
        </UPopover>
      </div>
    </UContextMenu>
  </div>
</template>
