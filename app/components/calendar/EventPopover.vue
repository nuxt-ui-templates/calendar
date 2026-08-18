<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'

// An event running past midnight draws in every day it touches, and only the
// segment holding its start owns the form, the way a draft ghost spanning two
// month rows does. Defaulted rather than left off: Vue reads an absent boolean
// prop as `false`, which would leave every call site that does not draw an
// event twice unable to open one at all
const props = withDefaults(defineProps<{
  event: CalendarEvent
  disabled?: boolean
  anchored?: boolean
}>(), { anchored: true })

const { formSide } = useCalendar()
const { removeEvent, updateEvent } = useCalendarEvents()
const { editingId, openEvent, closeEvent } = useEventEditor()

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

// Held app-wide, so editing a date walks the chip to another day without
// taking the form down with it. A chip that renders already holding it is
// armed from the start, there is nothing left to wait for
const open = computed(() => props.anchored && editingId.value === props.event.id)
const active = computed(() => armed.value || open.value)

function onUpdateOpen(value: boolean) {
  if (props.disabled) {
    return
  }

  if (value) {
    openEvent(props.event.id)
  } else {
    closeEvent(props.event.id)
  }
}

function onRemove() {
  closeEvent(props.event.id)
  removeEvent(props.event.id)
}

const items = computed<ContextMenuItem[]>(() => [{
  label: 'Edit',
  icon: 'i-lucide-pencil',
  onSelect: () => openEvent(props.event.id)
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
    <slot
      v-if="!active"
      :open="false"
    />

    <!-- `as-child` drops its handlers on a component that renders a fragment,
      so the two triggers need a real element between them, and the trigger
      stays the event itself -->
    <UContextMenu
      v-else
      :items="items"
      :disabled="disabled"
      size="sm"
    >
      <div class="contents">
        <!-- The event opens straight into the form the draft uses, so there is
          no read-only step between pointing at an event and changing it. The
          content only mounts while it is open, which re-seeds it every time -->
        <UPopover
          :open="open"
          :ui="{ content: 'p-2 w-74' }"
          :content="{ side: formSide }"
          @update:open="onUpdateOpen"
        >
          <slot :open="open" />

          <template #content>
            <CalendarEventForm
              :event="event"
              @save="updateEvent"
              @remove="onRemove"
              @escape="closeEvent(event.id)"
            />
          </template>
        </UPopover>
      </div>
    </UContextMenu>
  </div>
</template>
