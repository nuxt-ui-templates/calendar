// Idempotent on purpose: deleting an event a cold serverless instance never
// saw should not error
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')!

  useStore().events.delete(id)

  return { id }
})
