<script setup lang="ts">
const now = useNow({ interval: 60_000 })

const top = computed(() => (now.value.getHours() * 60 + now.value.getMinutes()) * PX_PER_MINUTE)
</script>

<template>
  <div
    class="absolute inset-x-0 z-10 border-t-2 border-error pointer-events-none"
    :style="{ top: `${top}px` }"
  >
    <div class="absolute -top-[5px] -start-1 size-2 rounded-full bg-error" />
  </div>
</template>
