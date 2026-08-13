export default defineEventHandler((event): Calendar[] => {
  return useStore(event).calendars
})
