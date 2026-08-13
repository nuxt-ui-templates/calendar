<script setup lang="ts">
import { addMinutes, isToday, startOfDay } from 'date-fns'

// Placeholder blocks shown while a range loads, as [start hour, hours]
const SKELETONS = [[9, 1.5], [13, 1], [16, 2]] as const

const props = defineProps<{
  day: Date
  events: PositionedEvent[]
  loading?: boolean
}>()

const { createEvent } = useCalendar()

// Clicking an empty slot creates a one-hour event snapped to the half hour
function onClick(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const minutes = Math.floor((event.clientY - rect.top) / PX_PER_MINUTE / 30) * 30
  const start = addMinutes(startOfDay(props.day), minutes)

  createEvent({ start, end: addMinutes(start, 60) })
}
</script>

<template>
  <div
    data-day-column
    class="relative border-s border-default"
    :style="{ height: `${24 * HOUR_HEIGHT}px` }"
    @click="onClick"
  >
    <div
      v-for="hour in 23"
      :key="hour"
      class="absolute inset-x-0 border-t border-default pointer-events-none"
      :style="{ top: `${hour * HOUR_HEIGHT}px` }"
    />

    <USkeleton
      v-for="[hour, hours] in loading ? SKELETONS : []"
      :key="hour"
      class="absolute inset-x-1 rounded-md"
      :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${hours * HOUR_HEIGHT}px` }"
    />

    <CalendarEventBlock
      v-for="positioned in events"
      :key="positioned.event.id"
      :positioned="positioned"
    />

    <ClientOnly>
      <CalendarNowIndicator v-if="isToday(day)" />
    </ClientOnly>
  </div>
</template>
