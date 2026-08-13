// Upsert on purpose: sessions are in-memory and per-instance, so a cold
// instance may receive an update for an event it has never seen
export default defineEventHandler(async (event): Promise<CalendarEvent> => {
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, eventSchema.parse)

  const updated = { ...body, id }
  useEditableStore(event).events.set(id, updated)

  return updated
})
