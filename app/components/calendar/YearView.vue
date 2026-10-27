<script setup lang="ts">
import { addDays, isToday, isWeekend, startOfWeek } from 'date-fns'

const { date, pathFor } = useCalendar()

const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' })
const weekdays = Array.from({ length: 7 }, (_, index) => weekdayFormat.format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), index)))

// Each month on the six weeks the month view would give it, so they all stand
// the same height and line up row by row. The days around it stay blank
const months = computed(() => Array.from({ length: 12 }, (_, index) => {
  const first = new Date(date.value.year, index, 1)
  const start = startOfWeek(first, { weekStartsOn: 1 })

  return {
    first,
    days: Array.from({ length: 42 }, (_, offset) => {
      const day = addDays(start, offset)

      return { day, inMonth: day.getMonth() === index }
    })
  }
}))

const today = todayDate()

const sections = useTemplateRef('sections')

// Opens on the month it was reached from rather than on January, which a
// small window scrolls out of view. Looked up by its month, a `v-for` ref
// array does not promise the order of the list
onMounted(() => {
  sections.value?.find(section => section.dataset.month === String(date.value.month))?.scrollIntoView({ block: 'center' })
})
</script>

<template>
  <!-- Starts at the page top so the months scroll behind the header blur, the
    padding and the scroll padding keep them clear of it at rest -->
  <UScrollArea
    class="flex-1 [view-transition-name:calendar] scroll-pt-[calc(var(--ui-header-height)+1.5rem)]"
  >
    <!-- Three months across on a phone the way iOS lays them out, small enough
      that the year fits about one screen, the days giving up a little of
      their size where a column cannot fit them whole. The bottom padding
      clears the phone toolbar -->
    <div class="grid grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8 px-4 lg:px-6 pt-[calc(var(--ui-header-height)+1.5rem)] pb-24 lg:pb-8">
      <section
        v-for="month in months"
        ref="sections"
        :key="month.first.getMonth()"
        :data-month="month.first.getMonth() + 1"
        class="relative"
      >
        <NuxtLink
          :to="pathFor(toCalendarDate(month.first), 'month')"
          :prefetch="false"
          class="inline-block text-base sm:text-lg font-semibold rounded-md outline-primary/25 focus-visible:outline-3"
          :class="today.year === date.year && today.month === month.first.getMonth() + 1 ? 'text-primary' : 'text-highlighted'"
        >
          {{ formatMonth(month.first) }}
        </NuxtLink>

        <div class="max-sm:hidden grid grid-cols-7 mt-2 text-center text-[10px] font-medium text-dimmed">
          <span
            v-for="(weekday, index) in weekdays"
            :key="index"
          >
            {{ weekday }}
          </span>
        </div>

        <div class="grid grid-cols-7 mt-1 gap-y-0.5 justify-items-center">
          <template
            v-for="{ day, inMonth } in month.days"
            :key="day.getTime()"
          >
            <NuxtLink
              v-if="inMonth"
              :to="pathFor(toCalendarDate(day), 'day')"
              :prefetch="false"
              :aria-label="formatFullDate(day)"
              class="inline-flex items-center justify-center w-full max-w-4 aspect-square sm:size-6 sm:max-w-none text-[9px] sm:text-xs tabular-nums rounded-full transition-colors focus-visible:outline-3"
              :class="isToday(day)
                ? 'font-semibold text-inverted bg-primary active:bg-primary/75 outline-primary/25'
                : [isWeekend(day) ? 'text-muted' : 'text-default', 'hover:bg-(--control-bg) active:bg-(--control-bg) outline-inverted/25']"
            >
              {{ day.getDate() }}
            </NuxtLink>
            <span
              v-else
              class="w-full max-w-4 aspect-square sm:size-6 sm:max-w-none"
            />
          </template>
        </div>

        <!-- A phone's day is too small a target to aim for, so the month is
          the one, the way the iOS year view zooms in -->
        <NuxtLink
          :to="pathFor(toCalendarDate(month.first), 'month')"
          :prefetch="false"
          :aria-label="formatMonth(month.first)"
          class="sm:hidden absolute inset-0"
        />
      </section>
    </div>
  </UScrollArea>
</template>
