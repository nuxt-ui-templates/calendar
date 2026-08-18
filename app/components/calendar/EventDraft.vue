<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  // A block in the time grid, or a pill in a month cell and the all-day row
  variant: 'block' | 'chip'
  // The segment the popover hangs off. An all-day draft spanning two month
  // rows draws twice and only the one holding its start owns the form
  anchored?: boolean
  continuesBefore?: boolean
  continuesAfter?: boolean
}>()

const { formSide } = useCalendar()
const { draft, open, pendingScroll, updateDraft, discardDraft, commitDraft, registerAnchor } = useEventDraft()
const { calendars } = useCalendarEvents()

// Every segment counts: the draft is discarded once none of them is left, so
// navigating or scrolling its day away takes it with it
registerAnchor()

const color = computed(() => calendars.value.find(calendar => calendar.id === draft.value?.calendarId)?.color ?? 'primary')
const title = computed(() => draft.value?.title || DEFAULT_TITLE)
const times = computed(() => draft.value && !draft.value.allDay
  ? `${formatTime(draft.value.start)} – ${formatTime(draft.value.end)}`
  : null)

// There is nothing to press: closing the form is what saves the draft, the
// way the inspector commits what it is showing. Escape is the way out, and
// the only close that hands the focus back to where the draft came from
let dismissedByEscape = false

const content = computed(() => ({
  side: formSide.value,
  sideOffset: 8,
  collisionPadding: 16,
  onEscapeKeyDown: () => {
    dismissedByEscape = true
  }
}))

function onUpdateOpen(value: boolean) {
  if (value) {
    return
  }

  if (dismissedByEscape) {
    discardDraft(true)
  } else {
    commitDraft()
  }

  dismissedByEscape = false
}

const el = useTemplateRef('el')

// The `+` button draws on the date the route is on, which can be an hour or a
// month row away from what is on screen
function reveal() {
  if (!props.anchored || !pendingScroll.value) {
    return
  }

  pendingScroll.value = false

  // `nearest` honours the scroller's top padding, so the ghost lands under
  // the glass chrome rather than behind it
  nextTick(() => el.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
}

onMounted(reveal)
watch(pendingScroll, reveal)
</script>

<template>
  <!-- The anchor slot rather than the trigger: `PopoverAnchor` binds no
    handlers, so pressing the ghost cannot toggle the form it belongs to -->
  <UPopover
    :open="!!anchored && open"
    :content="content"
    :ui="{ content: 'p-2 w-74' }"
    @update:open="onUpdateOpen"
  >
    <template #anchor>
      <div
        ref="el"
        v-bind="$attrs"
        data-draft
        aria-hidden="true"
        class="select-none shadow-lg transition-colors"
        :class="[
          eventBlockClasses[color],
          variant === 'block'
            ? 'absolute z-20 flex flex-col items-start overflow-hidden rounded-xs px-3 py-1 text-xs text-start'
            : 'flex items-center gap-1.5 min-w-0 rounded-full px-1.5 py-0.5 text-xs',
          continuesBefore && 'rounded-s-none',
          continuesAfter && 'rounded-e-none'
        ]"
        @pointerdown.stop
      >
        <span
          v-if="variant === 'block'"
          class="absolute inset-s-1 inset-y-1 w-1 rounded-full"
          :class="calendarDotClasses[color]"
        />

        <span
          class="font-medium truncate"
          :class="variant === 'block' && 'w-full'"
        >{{ title }}</span>

        <span
          v-if="times"
          class="truncate opacity-80 tabular-nums"
          :class="variant === 'block' ? 'w-full' : 'ms-auto shrink-0 text-[11px]'"
        >{{ variant === 'block' ? times : formatTime(draft!.start) }}</span>
      </div>
    </template>

    <template #content>
      <CalendarEventForm
        v-if="draft"
        :draft="draft"
        @update="updateDraft"
      />
    </template>
  </UPopover>
</template>
