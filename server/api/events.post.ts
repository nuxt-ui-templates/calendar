export default defineEventHandler(async (event): Promise<CalendarEvent> => {
  const body = await readValidatedBody(event, eventSchema.parse)

  useEditableStore(event).events.set(body.id, body)

  setResponseStatus(event, 201)

  return body
})
