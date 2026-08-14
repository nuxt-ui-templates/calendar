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

const { view, date, title, monthLabelsVisible, prevDate, nextDate, pathFor, setDirection, isSidebarOpen } = useCalendar()
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
    class="relative flex-1 flex flex-col overflow-hidden -z-1"
  >
    <!-- Floating over the views so their content scrolls behind the blur, its
      own view transition name keeps it above the sliding grid snapshot (which
      is lifted into the transition overlay, out of reach of the blur) -->
    <header class="absolute top-0 pt-2 inset-x-0 z-10 flex items-center gap-2 sm:gap-4 h-[calc(var(--ui-header-height)+0.5rem)] px-4 border-b border-default glass-material [view-transition-name:header]">
      <!-- The tint rides its own layer so it can run solid at the top and
        dissolve towards the grid instead of ending on a line. Solid up there
        because rows scrolled past the viewport stop being sampled by the
        filter, and anything less than opaque shows their remains clipping
        mid-band. The blur itself stays uniform: masking it away anywhere
        just uncovers sharp content -->
      <div class="pointer-events-none absolute inset-0 -z-10 bg-(--glass-bg) bg-linear-to-b from-default from-40% to-transparent" />

      <!-- Its own gap rather than the header's, so the title starts at the
        same spot at every width the menu button shows at and the month view
        has a single offset to dock its labels on -->
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <!-- Below `lg` the sidebar is a slideover, this is what opens it -->
        <UButton
          icon="i-lucide-menu"
          color="neutral"
          variant="outline"
          size="sm"
          aria-label="Open menu"
          class="lg:hidden shrink-0 rounded-full"
          @click="isSidebarOpen = true"
        />

        <!-- The month view slides its own copy of this title over the top
          while it scrolls, docking it right here, so this one steps aside for
          as long as they are up. Both sit at the same spot, and it steps aside
          without fading: two copies of the same text at half opacity each come
          out lighter than one at full, so a crossfade dips in the middle. It
          holds instead until the arriving label is all the way in, and is back
          before the leaving one starts out, always opaque under a partly
          transparent copy of itself -->
        <h1
          class="flex items-baseline gap-1.5 text-xl sm:text-2xl tracking-tight min-w-0 flex-1 transition-opacity duration-0"
          :class="view === 'month' && monthLabelsVisible ? 'opacity-0 delay-150' : 'opacity-100'"
        >
          <span class="font-bold text-highlighted truncate">{{ title.months }}</span>
          <span class="font-normal text-muted hidden sm:inline">{{ title.year }}</span>
        </h1>
      </div>

      <!-- Down to the initial below `md`, where the header cannot spare the
        width for the labels. The triggers give up their padding for it, three
        of them share 5rem there -->
      <UTabs
        :items="views"
        :content="false"
        :model-value="view"
        color="neutral"
        size="sm"
        class="mx-auto w-20 sm:w-42 lg:w-48"
        :ui="{ trigger: 'p-1 lg:p-1.5' }"
        @update:model-value="onViewChange"
      >
        <template #default="{ item }">
          <span class="sm:hidden">{{ item.label.charAt(0) }}</span>
          <span class="hidden sm:inline">{{ item.label }}</span>
        </template>
      </UTabs>

      <!-- Only the title grows below `md`, so the switcher and the controls
        stay together on the end rather than drifting apart -->
      <div class="flex items-center gap-2 md:flex-1 justify-end">
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

        <UTheme :props="{ button: { color: 'neutral', variant: 'soft', size: 'sm', class: 'rounded-full' } }">
          <div class="flex items-center gap-1">
            <UTooltip
              text="Previous"
              :kbds="['arrowleft']"
            >
              <UButton
                icon="i-lucide-chevron-left"
                aria-label="Previous"
                prefetch-on="interaction"
                :to="pathFor(prevDate)"
                @click="setDirection('left')"
              />
            </UTooltip>
            <UTooltip
              text="Today"
              :kbds="['t']"
            >
              <UButton
                label="Today"
                class="hidden sm:inline-flex rounded-full"
                :to="pathFor(todayDate())"
              />
            </UTooltip>
            <UTooltip
              text="Next"
              :kbds="['arrowright']"
            >
              <UButton
                icon="i-lucide-chevron-right"
                aria-label="Next"
                prefetch-on="interaction"
                :to="pathFor(nextDate)"
                @click="setDirection('right')"
              />
            </UTooltip>
          </div>
        </UTheme>
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
