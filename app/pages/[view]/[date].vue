<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  // Date changes update the mounted view in place, the default key would
  // remount the page (and reset the month view scroll) on every URL sync
  key: route => route.params.view as string,
  validate(route) {
    if (!['day', 'week', 'month'].includes(route.params.view as string)) {
      return false
    }

    try {
      parseDate(route.params.date as string)
      return true
    } catch {
      return false
    }
  },
  // The month view scrolls continuously and syncs the URL as it goes,
  // sliding view transitions would fight the scroll
  middleware: [(to, from) => {
    if (to.params.view === 'month' && from?.params.view === 'month') {
      to.meta.viewTransition = false
    }
  }]
})

const { view, date, title, visibleMonth, prevDate, nextDate, pathFor, setDirection, createEvent } = useCalendar()
const { online, queue } = useCalendarEvents()

const views = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' }
] satisfies TabsItem[]

function onViewChange(value: string | number) {
  navigateTo(pathFor(date.value, value as CalendarView))
}
</script>

<template>
  <div
    class="relative flex-1 flex flex-col overflow-hidden lg:peer-data-[variant=floating]:my-2"
  >
    <!-- Floating over the views so their content scrolls behind the blur -->
    <header class="absolute top-0 inset-x-0 z-10 flex items-center gap-2 sm:gap-4 h-(--ui-header-height) px-4 sm:px-6 border-b border-default bg-default/50 backdrop-blur">
      <!-- The month view renders its own docking title in an overlay, the
        h1 only keeps the layout width -->
      <h1
        class="flex items-baseline gap-1.5 text-xl sm:text-2xl tracking-tight min-w-0 flex-1"
        :class="view === 'month' && visibleMonth && 'invisible'"
      >
        <span class="font-bold text-highlighted truncate">{{ title.months }}</span>
        <span class="font-normal text-muted hidden sm:inline">{{ title.year }}</span>
      </h1>

      <UTabs
        :items="views"
        :content="false"
        :model-value="view"
        color="neutral"
        size="sm"
        class="mx-auto hidden md:flex w-48"
        :ui="{
          indicator: 'bg-default rounded-full',
          list: 'rounded-full gap-1 bg-white/5',
          trigger: 'px-1 data-[state=active]:text-highlighted w-full rounded-full in-[[data-slot=list]:not(:has([data-slot=indicator]))]:data-[state=active]:before:bg-default hover:bg-default/50'
        }"
        @update:model-value="onViewChange"
      />

      <div class="flex items-center gap-2 ms-auto md:ms-0 flex-1 justify-end">
        <UTooltip
          v-if="!online"
          text="Changes are kept locally and sync when you reconnect"
        >
          <UBadge
            icon="i-lucide-cloud-off"
            color="warning"
            variant="subtle"
            :label="queue.length ? `Offline (${queue.length})` : 'Offline'"
          />
        </UTooltip>

        <USelect
          :items="views"
          :model-value="view"
          size="sm"
          class="md:hidden w-24"
          @update:model-value="onViewChange"
        />

        <div class="flex items-center gap-1">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="soft"
            aria-label="Previous"
            size="sm"
            prefetch-on="interaction"
            :to="pathFor(prevDate)"
            class="rounded-full"
            @click="setDirection('left')"
          />
          <UButton
            label="Today"
            color="neutral"
            variant="soft"
            size="sm"
            class="hidden sm:inline-flex rounded-full"
            :to="pathFor(todayDate())"
          />
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="soft"
            size="sm"
            aria-label="Next"
            prefetch-on="interaction"
            :to="pathFor(nextDate)"
            class="rounded-full"
            @click="setDirection('right')"
          />
        </div>

        <UButton
          icon="i-lucide-plus"
          aria-label="New event"
          size="sm"
          class="rounded-full"
          @click="createEvent()"
        />
      </div>
    </header>

    <!-- The view transition name lives on each view's scroller: naming this
      wrapper would create a stacking context and keep the month labels from
      painting above the translucent header -->
    <div class="flex-1 flex flex-col min-h-0">
      <CalendarMonthView v-if="view === 'month'" />
      <CalendarWeekView v-else />
    </div>
  </div>
</template>
