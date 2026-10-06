import { defineEventHandler } from 'nuxt/server'

export default defineEventHandler((event): Calendar[] => {
  return useStore(event).calendars
})
