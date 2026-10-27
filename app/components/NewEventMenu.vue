<script setup lang="ts">
// Floating, it is the phone toolbar's button down in the corner, opening
// upwards from there
const props = defineProps<{
  floating?: boolean
}>()

const { createAtAnchor, createFromQuick } = useEventDraft()

const open = ref(false)
const text = ref('')
const loading = ref(false)

// A ghost's form takes the focus as it opens, and the focus this menu hands
// back to its button as it closes would take it straight out again: a form
// losing the focus is dismissed, and dismissing a draft's form saves it
let handedOff = false

const content = computed(() => ({
  side: props.floating ? 'top' : 'bottom',
  align: props.floating ? 'end' : 'start',
  alignOffset: props.floating ? 0 : -14,
  onCloseAutoFocus: (event: Event) => {
    if (handedOff) {
      event.preventDefault()
      handedOff = false
    }
  }
}) as const)

function handOff(create: () => Promise<void>) {
  handedOff = true
  open.value = false

  return create()
}

// The model reads the phrase in the browser, and is a download the first time
// it does: the input holds on with a spinner until it has, and only then
// steps aside for the ghost
async function onSubmit() {
  const phrase = text.value.trim()
  if (!phrase || loading.value) {
    return
  }

  loading.value = true

  try {
    const quick = await parseQuickEvent(phrase)

    text.value = ''

    await handOff(() => createFromQuick(quick, phrase))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="content"
    :ui="{ content: 'p-2 w-72 max-w-[calc(100vw-1rem)]' }"
  >
    <UTooltip text="New event">
      <UButton
        icon="i-lucide-plus"
        size="sm"
        aria-label="New event"
      />
    </UTooltip>

    <template #content>
      <UButton
        icon="i-lucide-calendar-plus"
        label="New event"
        color="neutral"
        variant="ghost"
        block
        class="justify-start"
        @click="handOff(createAtAnchor)"
      >
        <template #trailing>
          <UKbd
            value="n"
            variant="soft"
            class="ms-auto"
          />
        </template>
      </UButton>

      <USeparator class="my-2" />

      <form @submit.prevent="onSubmit">
        <UFormField
          label="Create quick event"
          class="px-1 pb-1"
        >
          <UInput
            v-model="text"
            placeholder="Movie at 7pm on Friday"
            :loading="loading"
            :maxlength="100"
            autofocus
            class="w-full"
          />
        </UFormField>
      </form>
    </template>
  </UPopover>
</template>
