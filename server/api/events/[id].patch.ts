// Upsert on purpose: the in-memory store is per-instance on serverless, so a
// cold instance may receive an update for an event it has never seen
export default defineEventHandler(async (event): Promise<CalendarEvent> => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, eventSchema.parse)

  const updated = { ...body, id }
  useStore().events.set(id, updated)

  return updated
})
