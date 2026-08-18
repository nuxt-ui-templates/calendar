<script setup lang="ts">
import type { ContextMenuItem } from '@nuxt/ui'

const props = defineProps<{
  event: CalendarEvent
  disabled?: boolean
}>()

const { formSide } = useCalendar()
const { removeEvent, updateEvent } = useCalendarEvents()

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

function onRemove() {
  open.value = false
  removeEvent(props.event.id)
}

const items = computed<ContextMenuItem[]>(() => [{
  label: 'Edit',
  icon: 'i-lucide-pencil',
  onSelect: () => {
    open.value = true
  }
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
      v-if="!armed"
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
            />
          </template>
        </UPopover>
      </div>
    </UContextMenu>
  </div>
</template>
