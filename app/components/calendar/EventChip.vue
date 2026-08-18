<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  event: CalendarEvent
  showTime?: boolean
}>()

const { calendars } = useCalendarEvents()

const calendar = computed(() => calendars.value.find(calendar => calendar.id === props.event.calendarId))
const color = computed(() => calendar.value?.color ?? 'primary')
</script>

<template>
  <CalendarEventPopover
    v-slot="{ open }"
    :event="event"
  >
    <button
      v-bind="$attrs"
      type="button"
      data-event
      class="select-none flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs text-start transition-colors focus-visible:outline-3"
      :class="[
        eventOutlineClasses[color],
        event.allDay
          ? eventBlockClasses[color]
          : ['text-default hover:bg-(--control-bg)', open && 'bg-(--control-bg)', eventChipCompactClasses[color]]
      ]"
      :aria-label="event.allDay ? event.title : `${event.title}, ${formatTime(new Date(event.start))}`"
      @click.stop
    >
      <span
        v-if="!event.allDay"
        class="max-lg:hidden size-2 shrink-0 rounded-full"
        :class="calendarDotClasses[color]"
      />
      <span class="font-medium truncate">{{ event.title }}</span>
      <!-- `data-time` so a call site in a tight spot can hide it from outside -->
      <span
        v-if="showTime && !event.allDay"
        data-time
        class="ms-auto shrink-0 text-muted tabular-nums text-[11px]"
      >
        {{ formatTime(new Date(event.start)) }}
      </span>
    </button>
  </CalendarEventPopover>
</template>
