export default defineEventHandler(async (event): Promise<CalendarEvent> => {
  const body = await readValidatedBody(event, eventSchema.parse)

  useStore().events.set(body.id, body)

  setResponseStatus(event, 201)

  return body
})
