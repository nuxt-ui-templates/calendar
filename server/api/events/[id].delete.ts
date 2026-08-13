// Idempotent on purpose: deleting an event a cold instance never saw should
// not error
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')!

  useEditableStore(event).events.delete(id)

  return { id }
})
