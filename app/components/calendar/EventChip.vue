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
  <CalendarEventPopover :event="event">
    <button
      v-bind="$attrs"
      type="button"
      data-event
      class="flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs text-start transition-colors"
      :class="event.allDay ? eventBlockClasses[color] : 'text-default hover:bg-elevated'"
      :aria-label="event.allDay ? event.title : `${event.title}, ${formatTime(new Date(event.start))}`"
      @click.stop
    >
      <span
        v-if="!event.allDay"
        class="size-2 shrink-0 rounded-full"
        :class="calendarDotClasses[color]"
      />
      <span class="font-medium truncate">{{ event.title }}</span>
      <span
        v-if="showTime && !event.allDay"
        class="ms-auto shrink-0 text-muted tabular-nums text-[11px]"
      >
        {{ formatTime(new Date(event.start)) }}
      </span>
    </button>
  </CalendarEventPopover>
</template>
