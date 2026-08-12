<script setup lang="ts">
import { addMinutes } from 'date-fns'

const props = defineProps<{
  positioned: PositionedEvent
}>()

const { calendars, updateEvent } = useCalendarEvents()

const event = computed(() => props.positioned.event)
const calendar = computed(() => calendars.value.find(calendar => calendar.id === event.value.calendarId))

const {
  dragging,
  suppressed,
  mode,
  deltaMinutes,
  deltaX,
  onPointerdown,
  onPointermove,
  onPointerup
} = useEventDrag(event, {
  onCommit(start, end) {
    updateEvent({ ...event.value, start: start.toISOString(), end: end.toISOString() })
  }
})

const style = computed(() => {
  const height = dragging.value && mode.value === 'resize'
    ? Math.max(props.positioned.height + deltaMinutes.value * PX_PER_MINUTE, MIN_EVENT_MINUTES * PX_PER_MINUTE)
    : props.positioned.height

  return {
    top: `${props.positioned.top}px`,
    height: `${height}px`,
    insetInlineStart: `calc(${props.positioned.left}% + 1px)`,
    width: `calc(${props.positioned.width}% - 2px)`,
    transform: dragging.value && mode.value === 'move'
      ? `translate(${deltaX.value}px, ${deltaMinutes.value * PX_PER_MINUTE}px)`
      : undefined
  }
})

// While dragging, show the previewed times instead of the stored ones
const previewTimes = computed(() => {
  const shift = dragging.value && mode.value === 'move' ? deltaMinutes.value : 0
  const start = addMinutes(new Date(event.value.start), shift)
  const end = addMinutes(new Date(event.value.end), dragging.value ? (mode.value === 'resize' ? deltaMinutes.value : shift) : 0)

  return `${formatTime(start)} – ${formatTime(end > start ? end : addMinutes(start, SNAP_MINUTES))}`
})

const compact = computed(() => props.positioned.height < 40)
</script>

<template>
  <CalendarEventPopover
    :event="event"
    :disabled="suppressed"
  >
    <button
      type="button"
      data-event
      class="absolute flex flex-col items-start overflow-hidden rounded-md px-3 py-1 text-xs text-start cursor-pointer transition-colors select-none touch-none"
      :class="[
        eventBlockClasses[calendar?.color ?? 'primary'],
        dragging ? 'z-20 ring-2 ring-inverted/25 shadow-lg' : 'z-5'
      ]"
      :style="style"
      :aria-label="`${event.title}, ${previewTimes}`"
      @click.stop
      @pointerdown="onPointerdown"
      @pointermove="onPointermove"
      @pointerup="onPointerup"
    >
      <span class="absolute inset-s-1 inset-y-1 w-1 rounded-full bg-inherit" />

      <span class="w-full font-bold truncate">{{ event.title }}</span>
      <span
        v-if="!compact || dragging"
        class="w-full truncate opacity-80 tabular-nums"
      >
        {{ previewTimes }}
      </span>

      <span
        data-resize-handle
        class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
      />
    </button>
  </CalendarEventPopover>
</template>
