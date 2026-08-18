<script setup lang="ts">
import { isToday } from 'date-fns'

// Placeholder blocks shown while a range loads, as [start hour, hours]
const SKELETONS = [[9, 1.5], [13, 1], [16, 2]] as const

defineProps<{
  day: Date
  events: PositionedEvent[]
  loading?: boolean
}>()

const { onGridPointerdown, onGridDblclick } = useEventDraft()
</script>

<template>
  <!-- The column start is the scroller's snap point for midnight, the hour
    lines cover the rest of the day. Its top is midnight for the gestures too,
    which read a time straight off the pointer -->
  <div
    data-day-column
    :data-date="isoDate(day)"
    class="relative border-s border-default snap-start"
    :style="{ height: `${24 * HOUR_HEIGHT}px` }"
    @pointerdown="onGridPointerdown($event, { kind: 'timed', day })"
    @dblclick="onGridDblclick($event, { kind: 'timed', day })"
  >
    <div
      v-for="hour in 23"
      :key="hour"
      class="absolute inset-x-0 border-t border-default pointer-events-none snap-start"
      :style="{ top: `${hour * HOUR_HEIGHT}px` }"
    />

    <USkeleton
      v-for="[hour, hours] in loading ? SKELETONS : []"
      :key="hour"
      class="absolute inset-x-1 rounded-xs"
      :style="{ top: `${hour * HOUR_HEIGHT}px`, height: `${hours * HOUR_HEIGHT}px` }"
    />

    <template
      v-for="positioned in events"
      :key="positioned.event.id"
    >
      <!-- The draft rode through the same layout, so it takes its slot and
        the day has already made room for it -->
      <CalendarEventDraft
        v-if="positioned.event.id === DRAFT_EVENT_ID"
        variant="block"
        anchored
        :style="eventBlockStyle(positioned)"
      />
      <CalendarEventBlock
        v-else
        :positioned="positioned"
      />
    </template>

    <ClientOnly>
      <CalendarNowIndicator v-if="isToday(day)" />
    </ClientOnly>
  </div>
</template>
