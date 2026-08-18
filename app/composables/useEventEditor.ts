// Which event has its form open. One id for the whole app rather than a flag
// inside every chip: the layout re-creates a chip whenever it moves to another
// day or another week, which is exactly what editing its dates does, and a
// local flag would go down with it mid-edit
const _useEventEditor = () => {
  const editingId = ref<string | null>(null)

  // The forms on screen, counted by the form itself: it only mounts while a
  // popover is open, so the two hooks always come in pairs
  const anchors = ref(0)

  function openEvent(id: string) {
    editingId.value = id
  }

  function closeEvent(id: string) {
    if (editingId.value === id) {
      editingId.value = null
    }
  }

  function registerAnchor() {
    onMounted(() => anchors.value++)
    onUnmounted(() => anchors.value--)
  }

  // Losing every form is how the id learns it has nowhere left to live:
  // navigating, switching view, or the month virtualizer recycling the row the
  // event sits in
  watch(anchors, (count) => {
    if (count || !editingId.value) {
      return
    }

    // A chip changing container unmounts during the patch and mounts back
    // after it, so its replacement gets a tick to turn up
    nextTick(() => {
      if (!anchors.value) {
        editingId.value = null
      }
    })
  })

  return {
    editingId,
    openEvent,
    closeEvent,
    registerAnchor
  }
}

export const useEventEditor = createAppComposable(_useEventEditor)
