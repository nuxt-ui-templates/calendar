export default defineEventHandler((): Calendar[] => {
  return useStore().calendars
})
